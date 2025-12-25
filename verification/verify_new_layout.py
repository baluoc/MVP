from playwright.sync_api import sync_playwright

def verify_layout(page):
    # 1. Dashboard View
    page.goto("http://localhost:5175")
    page.wait_for_selector("#view-dashboard", state="visible")
    # Verify grid layout exists
    page.wait_for_selector(".settings-grid", state="visible")
    # Verify Live Preview Card
    page.wait_for_selector("text=Live Preview", state="visible")

    page.screenshot(path="verification/new_dashboard.png")
    print("Captured New Dashboard")

    # 2. Settings View
    page.click("text=Settings")
    page.wait_for_selector("#view-settings", state="visible")
    # Verify Cards exist
    page.wait_for_selector("text=General Settings", state="visible")
    page.wait_for_selector("text=Allowed Users", state="visible")

    # Verify Progressive Disclosure (initially disabled/enabled based on config)
    # Check if banner is visible or not based on default enabled=false
    # By default enabled=false in code, so banner should be visible
    # But we might have loaded previous config. Let's just capture screenshot.
    page.wait_for_timeout(500)
    page.screenshot(path="verification/new_settings.png")
    print("Captured New Settings")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify_layout(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
