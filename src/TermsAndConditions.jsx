import React from "react";
import "./TermsAndConditions.css";

function TermsAndConditions({ onBack }) {
  return (
    <div className="terms-page">

      {/* HEADER */}
      <header className="terms-header">
        <button
          className="terms-back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="terms-header-content">
          <p className="terms-small-title">
            NITK CYCLE SHARING
          </p>

          <h1>Terms & Conditions</h1>

          <p>
            Please read these terms carefully before using
            the NITK Cycle Sharing platform.
          </p>
        </div>
      </header>

      {/* CONTENT */}
      <main className="terms-container">

        <div className="terms-intro">
          <p>
            Welcome to NITK Cycle Sharing. These Terms &
            Conditions govern your use of the platform,
            including listing, booking, renting, returning,
            and reporting cycles.
          </p>

          <p className="last-updated">
            Last updated: August 2026
          </p>
        </div>

        {/* 1 */}
        <section className="terms-section">
          <h2>1. Introduction</h2>

          <p>
            NITK Cycle Sharing is a platform designed to
            facilitate cycle sharing and rental between
            members of the campus community.
          </p>

          <p>
            By creating an account or using the platform,
            you agree to comply with these Terms &
            Conditions and all applicable campus rules.
          </p>
        </section>

        {/* 2 */}
        <section className="terms-section">
          <h2>2. Eligibility</h2>

          <p>
            Users must provide accurate information during
            registration and must be eligible to use the
            platform according to the rules established
            by the institution.
          </p>

          <p>
            Users are responsible for ensuring that their
            account information remains accurate and
            up to date.
          </p>
        </section>

        {/* 3 */}
        <section className="terms-section">
          <h2>3. User Accounts</h2>

          <ul>
            <li>
              Each user must maintain only their own account.
            </li>

            <li>
              Login credentials must not be shared with
              another person.
            </li>

            <li>
              Users are responsible for activity performed
              through their account.
            </li>

            <li>
              False, misleading, or fraudulent information
              may result in account suspension.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section className="terms-section">
          <h2>4. Cycle Listings</h2>

          <p>
            Cycle owners may list their cycles on the
            platform by providing the required information,
            including cycle details, pricing, location,
            and images.
          </p>

          <p>
            Owners must ensure that the information provided
            for a cycle is accurate and that they have the
            right to make the cycle available for rental.
          </p>
        </section>

        {/* 5 */}
        <section className="terms-section">
          <h2>5. Cycle Verification</h2>

          <p>
            Listed cycles may be subject to verification by
            an authorized administrator before becoming
            available for rental.
          </p>

          <p>
            The platform may reject, suspend, or remove a
            cycle listing if it does not satisfy the
            platform's verification or safety requirements.
          </p>
        </section>

        {/* 6 */}
        <section className="terms-section">
          <h2>6. Booking & Acceptance</h2>

          <p>
            A renter may request a cycle by submitting a
            booking request through the platform.
          </p>

          <p>
            A booking request does not automatically create
            an active rental. The rental becomes active only
            after the cycle owner accepts the request and
            the platform confirms the booking.
          </p>
        </section>

        {/* 7 */}
        <section className="terms-section">
          <h2>7. Rental Duration</h2>

          <p>
            The renter must use the cycle only during the
            approved rental period associated with the
            booking.
          </p>

          <p>
            The renter is expected to return the cycle within
            the agreed rental period and according to the
            return instructions provided by the platform.
          </p>
        </section>

        {/* 8 */}
        <section className="terms-section">
          <h2>8. Rental Charges & Security Deposit</h2>

          <p>
            Rental charges and security deposits, where
            applicable, will be displayed before the booking
            is confirmed.
          </p>

          <p>
            Additional charges may apply where a renter
            exceeds the permitted rental duration or is
            responsible for damage, loss, or other applicable
            charges.
          </p>
        </section>

        {/* 9 */}
        <section className="terms-section">
          <h2>9. Use of the Cycle</h2>

          <p>
            The renter must use the cycle responsibly and
            only for lawful purposes.
          </p>

          <ul>
            <li>
              The cycle must be handled with reasonable care.
            </li>

            <li>
              The renter must not intentionally damage,
              modify, or dismantle the cycle.
            </li>

            <li>
              The renter must not transfer the cycle to
              another person without authorization.
            </li>

            <li>
              The renter must comply with applicable campus
              and traffic safety rules.
            </li>
          </ul>
        </section>

        {/* 10 */}
        <section className="terms-section">
          <h2>10. Return of the Cycle</h2>

          <p>
            At the end of the rental period, the renter must
            return the cycle using an authorized return
            procedure.
          </p>

          <p>
            Depending on the available return options, the
            cycle may be returned to the owner or to an
            authorized administrator.
          </p>

          <p>
            Return confirmation may require verification,
            including an OTP or another authentication
            mechanism provided by the platform.
          </p>
        </section>

        {/* 11 */}
        <section className="terms-section">
          <h2>11. Late Returns & Extra Time</h2>

          <p>
            Users are expected to return cycles within the
            agreed rental period.
          </p>

          <p>
            Where a grace period is provided, it will be
            specified by the platform. Additional charges
            may apply after the applicable grace period has
            expired.
          </p>

          <p>
            Any applicable additional charges may be deducted
            from the security deposit according to the
            platform's rules.
          </p>
        </section>

        {/* 12 */}
        <section className="terms-section">
          <h2>12. Damage, Loss & Reports</h2>

          <p>
            Renters must report any damage, malfunction, or
            other issue with a cycle as soon as reasonably
            possible.
          </p>

          <p>
            The platform may provide a reporting mechanism
            through which users can submit details and
            supporting information about an incident.
          </p>

          <p>
            Where damage or loss is determined to be the
            responsibility of a user, applicable charges may
            be imposed according to the platform's policies.
          </p>
        </section>

        {/* 13 */}
        <section className="terms-section">
          <h2>13. Cancellation</h2>

          <p>
            Booking cancellation may be subject to the
            cancellation rules displayed by the platform.
          </p>

          <p>
            The platform may cancel or suspend a booking when
            required because of cycle availability,
            verification issues, safety concerns, misuse, or
            other operational reasons.
          </p>
        </section>

        {/* 14 */}
        <section className="terms-section">
          <h2>14. Prohibited Activities</h2>

          <p>
            Users must not use the platform or cycles for
            activities that are illegal, fraudulent, harmful,
            or contrary to institutional rules.
          </p>

          <ul>
            <li>
              Creating fake or duplicate accounts.
            </li>

            <li>
              Providing false information.
            </li>

            <li>
              Attempting to access another user's account.
            </li>

            <li>
              Manipulating bookings or platform data.
            </li>

            <li>
              Intentionally damaging or misusing cycles.
            </li>

            <li>
              Using a rented cycle for unauthorized purposes.
            </li>
          </ul>
        </section>

        {/* 15 */}
        <section className="terms-section">
          <h2>15. Owner Responsibilities</h2>

          <ul>
            <li>
              Owners must provide accurate cycle information.
            </li>

            <li>
              Owners must list only cycles that they are
              authorized to make available.
            </li>

            <li>
              Owners should ensure that the cycle is in a
              reasonably usable condition before rental.
            </li>

            <li>
              Owners must respond appropriately to booking
              requests and return-related communication.
            </li>
          </ul>
        </section>

        {/* 16 */}
        <section className="terms-section">
          <h2>16. Renter Responsibilities</h2>

          <ul>
            <li>
              Renters must inspect the cycle before use where
              reasonably possible.
            </li>

            <li>
              Renters must take reasonable care of the cycle.
            </li>

            <li>
              Renters must follow the agreed rental period.
            </li>

            <li>
              Renters must return the cycle using an
              authorized procedure.
            </li>

            <li>
              Renters must report damage, loss, or safety
              issues promptly.
            </li>
          </ul>
        </section>

        {/* 17 */}
        <section className="terms-section">
          <h2>17. Account Suspension & Termination</h2>

          <p>
            The platform or authorized administrators may
            restrict, suspend, or terminate an account if a
            user violates these Terms & Conditions, misuses
            the platform, provides false information, or
            engages in conduct that creates a safety or
            security concern.
          </p>
        </section>

        {/* 18 */}
        <section className="terms-section">
          <h2>18. Notifications & Communication</h2>

          <p>
            The platform may send users notifications
            relating to bookings, cycle listings, rental
            status, verification, reports, account activity,
            and other relevant platform activities.
          </p>

          <p>
            Users are responsible for keeping their registered
            contact information up to date.
          </p>
        </section>

        {/* 19 */}
        <section className="terms-section">
          <h2>19. Platform Availability</h2>

          <p>
            We aim to keep the platform available and
            functional, but temporary interruptions may occur
            because of maintenance, technical problems,
            network issues, or circumstances beyond the
            platform's control.
          </p>
        </section>

        {/* 20 */}
        <section className="terms-section">
          <h2>20. Privacy</h2>

          <p>
            User information is handled according to the
            platform's applicable privacy practices. Users
            should review the Privacy Policy to understand
            how their information is collected, used, and
            managed.
          </p>
        </section>

        {/* 21 */}
        <section className="terms-section">
          <h2>21. Changes to These Terms</h2>

          <p>
            These Terms & Conditions may be updated from time
            to time to reflect changes to the platform,
            operational procedures, institutional requirements,
            or applicable rules.
          </p>

          <p>
            Continued use of the platform after an update may
            constitute acceptance of the revised terms.
          </p>
        </section>

        {/* 22 */}
        <section className="terms-section">
          <h2>22. Disputes & Support</h2>

          <p>
            Users should first use the support or reporting
            mechanisms provided by the platform to resolve
            issues relating to bookings, cycles, payments,
            returns, or reports.
          </p>

          <p>
            Where necessary, disputes may be referred to the
            appropriate authorized campus authority according
            to applicable institutional procedures.
          </p>
        </section>

        {/* 23 */}
        <section className="terms-section final-section">
          <h2>23. Acceptance of Terms</h2>

          <p>
            By registering for an account, booking a cycle,
            listing a cycle, or otherwise using NITK Cycle
            Sharing, you acknowledge that you have read,
            understood, and agreed to these Terms &
            Conditions.
          </p>
        </section>

        {/* FOOTER */}
        <div className="terms-footer">
          <p>
            NITK Cycle Sharing
          </p>

          <span>
            Ride responsibly. Share responsibly.
          </span>
        </div>

      </main>
    </div>
  );
}

export default TermsAndConditions;