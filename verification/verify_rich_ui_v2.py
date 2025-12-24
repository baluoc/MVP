from playwright.sync_api import sync_playwright

def verify_rich_ui_v2():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Wait for server to start
            page.wait_for_timeout(5000)

            # Go to dashboard
            page.goto("http://localhost:5175/")

            # Wait for connection
            page.wait_for_selector("text=LIVE STREAM ACTIVE", timeout=10000)

            # Wait for events to populate
            page.wait_for_timeout(10000)

            # Take screenshot
            page.screenshot(path="verification/dashboard_rich_ui_v2.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_rich_ui_v2()
