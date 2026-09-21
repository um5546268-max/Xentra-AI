import os


def init_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("ENV", "development"),
        release=os.getenv("APP_VERSION", "0.1.0"),
        traces_sample_rate=0.1 if os.getenv("ENV") == "production" else 1.0,
        profiles_sample_rate=0.1,
        send_default_pii=False,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            LoggingIntegration(level=None, event_level="ERROR"),
        ],
    )