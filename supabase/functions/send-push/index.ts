import webpush from "npm:web-push";
import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// ============================================================
// SUPABASE EDGE FUNCTION
// send-push
//
// Handles:
//
// 1. Existing normal push notifications
// 2. Incoming UgO call notifications
//
// Normal notification:
//   record.user_id exists
//
// Incoming call:
//   record.caller_id exists
//   record.status === "calling"
// ============================================================
Deno.serve(async (req)=>{
  // ==========================================================
  // CORS
  // ==========================================================
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // ========================================================
    // SUPABASE SERVER CLIENT
    // ========================================================
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // ========================================================
    // VAPID CONFIGURATION
    // ========================================================
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    // ========================================================
    // READ WEBHOOK PAYLOAD
    // ========================================================
    const payload = await req.json();
    /*
     * Supabase Database Webhook:
     *
     * {
     *   type: "INSERT",
     *   table: "...",
     *   schema: "public",
     *   record: {...},
     *   old_record: null
     * }
     *
     * Direct callers can also send the record itself.
     */ const record = payload.record ?? payload;
    const table = payload.table ?? null;
    console.log("send-push received:", JSON.stringify({
      table,
      record
    }));
    // ========================================================
    // DETECT INCOMING CALL
    // ========================================================
    const isIncomingCall = table === "call_sessions" && record?.status === "calling" && !!record?.caller_id;
    // ========================================================
    // HANDLE INCOMING CALL
    // ========================================================
    if (isIncomingCall) {
      return await handleIncomingCall({
        supabase,
        record
      });
    }
    // ========================================================
    // OTHERWISE HANDLE EXISTING NORMAL NOTIFICATION
    // ========================================================
    return await handleNormalNotification({
      supabase,
      record
    });
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : JSON.stringify(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
// ============================================================
// INCOMING CALL HANDLER
// ============================================================
async function handleIncomingCall({ supabase, record }) {
  // ==========================================================
  // GET CALL INFORMATION
  // ==========================================================
  const callId = record.id;
  const bookingId = record.booking_id;
  const renterId = record.renter_id;
  const ownerId = record.owner_id;
  const callerId = record.caller_id;
  // ==========================================================
  // VALIDATION
  // ==========================================================
  if (!callId || !bookingId || !renterId || !ownerId || !callerId) {
    return jsonResponse({
      success: false,
      error: "call_sessions record must contain id, booking_id, renter_id, owner_id and caller_id"
    }, 400);
  }
  // ==========================================================
  // DETERMINE RECEIVER
  // ==========================================================
  let receiverId;
  if (callerId === renterId) {
    receiverId = ownerId;
  } else if (callerId === ownerId) {
    receiverId = renterId;
  } else {
    console.error("Invalid caller_id. Caller is not part of booking.", {
      callerId,
      renterId,
      ownerId
    });
    return jsonResponse({
      success: false,
      error: "Caller is not a participant in the booking."
    }, 400);
  }
  // ==========================================================
  // IDEMPOTENCY
  // ==========================================================
  //
  // This is extremely important.
  //
  // If the database webhook is delivered twice,
  // only the first Edge Function execution should
  // continue.
  //
  // We atomically change:
  //
  // call_notification_sent_at
  //
  // from NULL → current time.
  //
  // If another execution already changed it,
  // it receives zero rows and stops.
  // ==========================================================
  const { data: claimedCall, error: claimError } = await supabase.from("call_sessions").update({
    call_notification_sent_at: new Date().toISOString()
  }).eq("id", callId).is("call_notification_sent_at", null).select("id").maybeSingle();
  if (claimError) {
    throw claimError;
  }
  // ==========================================================
  // DUPLICATE WEBHOOK
  // ==========================================================
  if (!claimedCall) {
    console.log("Call notification already processed:", callId);
    return jsonResponse({
      success: true,
      duplicate: true,
      sent: 0,
      failed: 0
    });
  }
  // ==========================================================
  // GET RECEIVER'S PUSH SUBSCRIPTIONS
  // ==========================================================
  const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", receiverId);
  if (subscriptionError) {
    throw subscriptionError;
  }
  // ==========================================================
  // NO DEVICE REGISTERED
  // ==========================================================
  if (!subscriptions || subscriptions.length === 0) {
    console.log("Receiver has no push subscription:", receiverId);
    return jsonResponse({
      success: true,
      type: "incoming_call",
      receiver_id: receiverId,
      sent: 0,
      failed: 0,
      message: "Receiver has no registered push subscription."
    });
  }
  // ==========================================================
  // CALL NOTIFICATION PAYLOAD
  // ==========================================================
  const notificationPayload = JSON.stringify({
    title: "Incoming UgO Call",
    message: "You have an incoming UgO call.",
    action_type: "INCOMING_CALL",
    action_data: {
      call_id: callId,
      booking_id: bookingId,
      caller_id: callerId,
      renter_id: renterId,
      owner_id: ownerId
    },
    notification_id: callId
  });
  // ==========================================================
  // SEND TO ALL RECEIVER DEVICES
  // ==========================================================
  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions){
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };
    try {
      await webpush.sendNotification(pushSubscription, notificationPayload);
      sent++;
      console.log("Incoming call push sent:", {
        callId,
        receiverId,
        subscriptionId: subscription.id
      });
    } catch (pushError) {
      console.error("Incoming call push failed:", pushError);
      failed++;
      // ------------------------------------------------------
      // REMOVE DEAD SUBSCRIPTION
      // ------------------------------------------------------
      if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        console.log("Removed expired push subscription:", subscription.id);
      }
    }
  }
  // ==========================================================
  // RESPONSE
  // ==========================================================
  return jsonResponse({
    success: true,
    type: "incoming_call",
    call_id: callId,
    caller_id: callerId,
    receiver_id: receiverId,
    sent,
    failed
  });
}
// ============================================================
// NORMAL NOTIFICATION HANDLER
// ============================================================
//
// This preserves your existing notification system.
//
// Expected record:
//
// {
//   user_id,
//   title,
//   message,
//   action_type,
//   action_data
// }
// ============================================================
async function handleNormalNotification({ supabase, record }) {
  const { user_id, title, message, action_type = "NONE", action_data = {} } = record;
  // ==========================================================
  // VALIDATION
  // ==========================================================
  if (!user_id || !title || !message) {
    return jsonResponse({
      success: false,
      error: "user_id, title and message are required"
    }, 400);
  }
  // ==========================================================
  // GET USER PUSH SUBSCRIPTIONS
  // ==========================================================
  const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", user_id);
  if (subscriptionError) {
    throw subscriptionError;
  }
  // ==========================================================
  // NO REGISTERED DEVICES
  // ==========================================================
  if (!subscriptions || subscriptions.length === 0) {
    return jsonResponse({
      success: true,
      message: "No push subscriptions found for this user",
      sent: 0,
      failed: 0
    });
  }
  // ==========================================================
  // NORMAL NOTIFICATION PAYLOAD
  // ==========================================================
  const notificationPayload = JSON.stringify({
    title,
    message,
    action_type,
    action_data,
    notification_id: record.id ?? null
  });
  let sent = 0;
  let failed = 0;
  // ==========================================================
  // SEND TO ALL USER DEVICES
  // ==========================================================
  for (const subscription of subscriptions){
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };
    try {
      await webpush.sendNotification(pushSubscription, notificationPayload);
      sent++;
    } catch (pushError) {
      console.error("Push failed:", pushError);
      failed++;
      // ------------------------------------------------------
      // REMOVE EXPIRED / INVALID SUBSCRIPTIONS
      // ------------------------------------------------------
      if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }
  // ==========================================================
  // RESPONSE
  // ==========================================================
  return jsonResponse({
    success: true,
    type: "normal_notification",
    sent,
    failed
  });
}
// ============================================================
// JSON RESPONSE HELPER
// ============================================================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
