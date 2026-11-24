import base64
from functools import lru_cache
from html import escape
from pathlib import Path

from app.core.config import settings
from app.core.email import EmailAttachment

_ASSETS_DIR = Path(__file__).resolve().parent / "assets"
ALTIUS_LOGO_CID = "altius-logo"
TRIVIUM_LOGO_CID = "trivium-logo"


@lru_cache(maxsize=4)
def _load_asset_base64(filename: str) -> str:
    return base64.b64encode((_ASSETS_DIR / filename).read_bytes()).decode("ascii")


def get_branded_email_attachments() -> list[EmailAttachment]:
    """Return inline CID image attachments for the Altius and Trivium logos."""
    attachments: list[EmailAttachment] = []
    if not settings.EMAIL_LOGO_URL and (_ASSETS_DIR / "altius-logo.png").is_file():
        attachments.append(
            EmailAttachment(
                name="altius-logo.png",
                content_type="image/png",
                content_in_base64=_load_asset_base64("altius-logo.png"),
                content_id=ALTIUS_LOGO_CID,
            )
        )
    if (_ASSETS_DIR / "trivium-logo.png").is_file():
        attachments.append(
            EmailAttachment(
                name="trivium-logo.png",
                content_type="image/png",
                content_in_base64=_load_asset_base64("trivium-logo.png"),
                content_id=TRIVIUM_LOGO_CID,
            )
        )
    return attachments


def render_branded_email(
    *,
    badge_text: str,
    badge_bg: str,
    badge_color: str,
    heading: str,
    greeting: str,
    body_paragraphs: list[str],
    username: str | None = None,
    cta_label: str | None = None,
    cta_url: str | None = None,
) -> str:
    """Render a responsive, inline-styled Altius HTML email with logo and Trivium trademark."""
    safe_project = escape(settings.PROJECT_NAME)
    safe_badge = escape(badge_text)
    safe_heading = escape(heading)
    safe_greeting = escape(greeting)

    logo_src = (
        escape(settings.EMAIL_LOGO_URL, quote=True)
        if settings.EMAIL_LOGO_URL
        else f"cid:{ALTIUS_LOGO_CID}"
    )
    logo_block = (
        f'<img src="{logo_src}" alt="Altius" height="44" '
        'style="display:inline-block;vertical-align:middle;border:0;height:44px;width:auto;" />'
    )

    paragraphs_html = "".join(
        f'<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#334155;">{p}</p>'
        for p in body_paragraphs
    )

    username_box = ""
    if username is not None:
        safe_username = escape(username)
        username_box = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            'style="margin:18px 0 20px 0;background-color:#f5f7ff;'
            'border:1px solid #e2e4ec;border-radius:10px;">'
            '<tr><td style="padding:14px 18px;">'
            '<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;'
            'text-transform:uppercase;color:#4a5578;margin-bottom:4px;">Account Username</div>'
            f'<div style="font-family:Consolas,Monaco,monospace;font-size:16px;'
            f'font-weight:700;color:#0a2262;">{safe_username}</div>'
            "</td></tr></table>"
        )

    cta_html = ""
    if cta_label and cta_url:
        safe_cta_label = escape(cta_label)
        safe_cta_url = escape(cta_url, quote=True)
        cta_html = (
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px 0;">'
            '<tr><td style="border-radius:8px;background-color:#b44d70;">'
            f'<a href="{safe_cta_url}" target="_blank" '
            'style="display:inline-block;padding:12px 24px;font-size:14px;'
            'font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">'
            f"{safe_cta_label}</a>"
            "</td></tr></table>"
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{safe_heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a2262;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e4ec;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#6e3273 0%,#b44d70 45%,#e37c67 75%,#f4b767 100%);background-color:#b44d70;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color:#0a2262;padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    {logo_block}
                    <span style="display:inline-block;vertical-align:middle;margin-left:14px;">
                      <span style="display:block;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:#ffffff;line-height:1.1;">Altius</span>
                      <span style="display:block;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#cbd5e1;margin-top:3px;">{safe_project}</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <div style="margin-bottom:14px;">
                <span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:{badge_bg};color:{badge_color};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                  {safe_badge}
                </span>
              </div>
              <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;line-height:1.25;color:#0a2262;">
                {safe_heading}
              </h1>
              <p style="margin:0 0 14px 0;font-size:15px;font-weight:600;line-height:1.5;color:#0a2262;">
                {safe_greeting}
              </p>
              {paragraphs_html}
              {username_box}
              {cta_html}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fc;border-top:1px solid #e2e4ec;padding:18px 28px;text-align:center;">
              <div style="margin-bottom:8px;">
                <img src="cid:{TRIVIUM_LOGO_CID}" alt="Trivium" width="92" style="display:inline-block;border:0;width:92px;height:auto;" />
              </div>
              <div style="font-size:12px;color:#64748b;line-height:1.5;">
                Trivium&trade; &middot; {safe_project}<br />
                Automated notification &mdash; please do not reply to this email.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
