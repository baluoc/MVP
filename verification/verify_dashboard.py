from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Wait for server to start
            page.wait_for_timeout(5000)

            # Go to dashboard
            page.goto("http://localhost:5175/")

            # Wait for connection (System Connected)
            page.wait_for_selector("text=System Connected", timeout=10000)

            # Wait a bit for mock events to populate
            page.wait_for_timeout(5000)

            # Take screenshot
            page.screenshot(path="verification/dashboard_status.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_dashboard()
