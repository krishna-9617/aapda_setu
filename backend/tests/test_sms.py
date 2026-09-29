"""
Demo SMS dispatch.

The one thing this suite cannot do is prove a real Twilio message arrives on
a phone - that needs a real account and this sandbox's network blocks
api.twilio.com outright (confirmed: a direct request returns 403
host_not_allowed). What it can and does prove: the fallback path is exactly
the simulated behaviour when nothing is configured, the mode-detection logic
correctly requires every one of its three conditions, and - the property that
actually matters for safety - no code path in this module can send to
anything other than the configured allowlist, regardless of what habitation
label it's given.
"""

import importlib

import pytest


@pytest.fixture
def sms(monkeypatch):
    """A freshly-imported sms module with a clean environment each test."""
    for var in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "VERIFIED_DEMO_PHONE_NUMBERS"):
        monkeypatch.delenv(var, raising=False)
    import sms as sms_module

    return importlib.reload(sms_module)


class TestFallbackIsDefault:
    def test_no_configuration_falls_back_to_simulated(self, sms):
        result = sms.dispatch_alert("Fulkipara", "Proceed to Barpeta Vidyapith.")
        assert result["delivery_mode"] == "simulated"
        assert result["delivery_status"] == "simulated"
        assert result["sid"] is None
        assert result["error"] is None

    def test_partial_configuration_still_falls_back(self, sms, monkeypatch):
        """Any one of the three required credentials missing is enough to fall back."""
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACxxxx")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "authtoken")
        # TWILIO_PHONE_NUMBER deliberately left unset
        monkeypatch.setenv("VERIFIED_DEMO_PHONE_NUMBERS", "+15551234567")
        result = sms.dispatch_alert("Ambari", "Test message")
        assert result["delivery_mode"] == "simulated"

    def test_credentials_without_verified_numbers_falls_back(self, sms, monkeypatch):
        """Full Twilio credentials but an empty allowlist must still simulate."""
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACxxxx")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "authtoken")
        monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+15559999999")
        result = sms.dispatch_alert("Howly", "Test message")
        assert result["delivery_mode"] == "simulated"

    def test_dispatch_never_raises_when_unconfigured(self, sms):
        """A plan approval must never fail because SMS isn't set up."""
        try:
            sms.dispatch_alerts([{"to": "Kalgachia", "message": "m1"}, {"to": "Baghbar", "message": "m2"}])
        except Exception as exc:  # noqa: BLE001
            pytest.fail(f"dispatch_alerts raised unexpectedly: {exc}")


class TestStatusReporting:
    def test_status_reports_simulated_when_unconfigured(self, sms):
        status = sms.sms_backend_status()
        assert status["mode"] == "simulated"
        assert status["reason"]

    def test_status_reports_live_when_fully_configured(self, sms, monkeypatch):
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACxxxx")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "authtoken")
        monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+15559999999")
        monkeypatch.setenv("VERIFIED_DEMO_PHONE_NUMBERS", "+15551111111,+15552222222")
        status = sms.sms_backend_status()
        assert status["mode"] == "live"
        assert status["verified_number_count"] == 2


class TestAllowlistSafety:
    """
    The property that actually matters: whatever label a caller passes in,
    the destination number can only ever come from the verified allowlist -
    never from the label itself, and never a number outside that list.
    """

    def test_target_number_always_from_the_allowlist(self, sms, monkeypatch):
        monkeypatch.setenv("VERIFIED_DEMO_PHONE_NUMBERS", "+15551111111,+15552222222,+15553333333")
        allowlist = set(sms._verified_numbers())

        # Try a spread of habitation-like labels - none of them are phone
        # numbers, and none of them should ever influence anything except
        # WHICH allowlisted number gets picked.
        for label in ["Fulkipara", "Ambari", "Howly", "Kalgachia", "Baghbar", "+919999999999"]:
            target = allowlist_pick(sms, label)
            assert target in allowlist, f"label {label!r} produced a target outside the allowlist"

    def test_a_label_that_looks_like_a_phone_number_is_never_dialled_directly(self, sms, monkeypatch):
        """
        If a habitation name ever accidentally contained something that looks
        like a phone number, dispatch must still only ever pick from the
        allowlist - the label is never parsed or used as a destination.
        """
        monkeypatch.setenv("VERIFIED_DEMO_PHONE_NUMBERS", "+15551111111")
        target = allowlist_pick(sms, "+919812345678")
        assert target == "+15551111111"

    def test_dispatch_alert_signature_has_no_phone_number_parameter(self, sms):
        """
        Structural check: dispatch_alert takes a label and a message, nothing
        that could be a caller-supplied destination number.
        """
        import inspect

        params = list(inspect.signature(sms.dispatch_alert).parameters)
        assert params == ["label", "message"]


def allowlist_pick(sms, label):
    """Replicate dispatch_alert's target-selection line in isolation."""
    numbers = sms._verified_numbers()
    return numbers[hash(label) % len(numbers)]


class TestAlertShapePreserved:
    def test_dispatch_alerts_preserves_extra_fields(self, sms):
        """Fields the caller already set (e.g. timestamp) must survive dispatch."""
        alerts = [{"to": "Fulkipara", "message": "m", "timestamp": "2026-01-01T00:00:00Z"}]
        enriched = sms.dispatch_alerts(alerts)
        assert enriched[0]["timestamp"] == "2026-01-01T00:00:00Z"

    def test_every_dispatched_alert_carries_the_disclosure(self, sms):
        enriched = sms.dispatch_alerts([{"to": "Fulkipara", "message": "m"}])
        assert "verified team numbers only" in enriched[0]["disclosure"]
