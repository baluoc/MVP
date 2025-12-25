from playwright.sync_api import sync_playwright

def verify_refined_ui(page):
    page.goto("http://localhost:5175")

    # Go to Settings
    page.click("text=Settings")
    page.wait_for_selector("#view-settings", state="visible")

    # 1. Capture Disabled State (Default)
    # The overlays should be visible because TTS is disabled by default in our reset config
    page.wait_for_timeout(500)
    page.screenshot(path="verification/ui_settings_disabled.png")
    print("Captured Settings (Disabled State)")

    # 2. Enable TTS and Capture Active State
    # Click the checkbox
    page.check("#tts-enabled")
    page.wait_for_timeout(500) # Wait for UI transition (overlays fading out)

    # Expand "Fine Tuning" details to show accordion works
    page.click("text=Fine Tuning")

    page.screenshot(path="verification/ui_settings_active.png")
    print("Captured Settings (Active State)")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify_refined_ui(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
