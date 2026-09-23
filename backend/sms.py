"""
Demo SMS dispatch via Twilio, with a safety boundary that is structural, not
just a matter of configuration.

WHY THIS IS SAFE FOR A HACKATHON DEMO
--------------------------------------
Twilio trial accounts can only send to phone numbers that have been
explicitly verified in the Twilio console under that same account. There is
no way to make a trial account text an arbitrary number - Twilio enforces
this on their end, which is exactly the safety boundary a demo needs. This
module adds a second, independent boundary on top of Twilio's own: the only
numbers this code will ever dial are the ones listed in the
VERIFIED_DEMO_PHONE_NUMBERS environment variable. No function in this file
accepts a phone number as an argument - every dispatch call reads the
allowlist itself. A habitation or site record has no phone number field
anywhere in this codebase, so there is no code path by which real citizen
data could reach this module even by mistake.

WHY THIS FALLS BACK RATHER THAN FAILS
--------------------------------------
Three independent conditions gate a real send: the twilio package must be
installed, TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER must all be set, and
VERIFIED_DEMO_PHONE_NUMBERS must list at least one number. Missing any of
these - which is the default, out-of-the-box state - falls back to the
original simulated behaviour rather than raising. A plan approval must never
fail because SMS dispatch isn't configured; SMS is a notification
side-effect of approval, not a precondition for it.
"""

import logging
import os

logger = logging.getLogger(__name__)

DEMO_DISCLOSURE = (
    "Demo SMS sent to verified team numbers only - production would "
    "integrate with district-authority-managed citizen contact lists."
)


def _verified_numbers():
    """The allowlist, parsed from the environment. Empty list if unset."""
    raw = os.getenv("VERIFIED_DEMO_PHONE_NUMBERS", "")
    return [n.strip() for n in raw.split(",") if n.strip()]


def _twilio_configured():
    """True only when every credential AND at least one verified number exist."""
    has_credentials = all(
        os.getenv(name) for name in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER")
    )
    return has_credentials and len(_verified_numbers()) > 0


def sms_backend_status():
    """
    What mode dispatch is currently running in, for the API and UI to report
    honestly rather than always claiming one or the other.
    """
    try:
        import twilio  # noqa: F401
        package_available = True
    except ImportError:
        package_available = False

    if not package_available:
        return {"mode": "simulated", "reason": "twilio package not installed"}
    if not all(os.getenv(name) for name in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER")):
        return {"mode": "simulated", "reason": "Twilio credentials not configured"}
    if not _verified_numbers():
        return {"mode": "simulated", "reason": "VERIFIED_DEMO_PHONE_NUMBERS is empty"}
    return {"mode": "live", "reason": None, "verified_number_count": len(_verified_numbers())}


def dispatch_alert(label, message):
    """
    Send one alert, real or simulated depending on configuration.

    `label` is display-only (a habitation name, e.g. "Fulkipara") - it is
    never used as, or converted into, a phone number. The actual destination
    is always drawn from the verified allowlist.

    Returns a dict with the fields the API/UI need:
        to               - display label (unchanged from the caller)
        message          - the alert text (unchanged from the caller)
        delivery_mode    - "simulated" | "live"
        delivery_status  - Twilio's status string ("queued", "sent", ...),
                            "simulated", or "failed"
        sid              - Twilio message SID, when a real send succeeded
        error            - error string, when a real send was attempted and failed
        disclosure       - the honesty framing the UI must always show
    """
    base = {"to": label, "message": message, "disclosure": DEMO_DISCLOSURE}

    if not _twilio_configured():
        return {**base, "delivery_mode": "simulated", "delivery_status": "simulated", "sid": None, "error": None}

    numbers = _verified_numbers()
    target_number = numbers[hash(label) % len(numbers)]

    try:
        from twilio.rest import Client

        client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        result = client.messages.create(
            body=f"[Aapda Setu demo - re: {label}] {message}",
            from_=os.getenv("TWILIO_PHONE_NUMBER"),
            to=target_number,
        )
        logger.info("Twilio dispatch for %s -> %s: sid=%s status=%s", label, target_number, result.sid, result.status)
        return {
            **base,
            "delivery_mode": "live",
            "delivery_status": result.status,
            "sid": result.sid,
            "error": None,
            "sent_to_verified_number": target_number,
        }
    except Exception as exc:  # noqa: BLE001 - any Twilio/network failure degrades to a reported failure, never a crash
        logger.warning("Twilio dispatch failed for %s: %s: %s", label, type(exc).__name__, exc)
        return {
            **base,
            "delivery_mode": "live",
            "delivery_status": "failed",
            "sid": None,
            "error": f"{type(exc).__name__}: {exc}",
        }


def dispatch_alerts(alerts):
    """
    Dispatch a list of alert dicts (each with at least `to` and `message`),
    returning them enriched with delivery fields. Any other field the caller
    already put on each alert - `timestamp`, for instance - is preserved.
    """
    enriched = []
    for alert in alerts:
        result = dispatch_alert(alert["to"], alert["message"])
        enriched.append({**alert, **result})
    return enriched
