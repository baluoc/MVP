
from playwright.sync_api import sync_playwright

def verify(page):
    print("Navigating to dashboard...")
    page.goto("http://localhost:5178")

    print("Waiting for page load...")
    page.wait_for_selector(".header")

    # Wait for MVP to appear (it updates every 2s, give it 5s)
    print("Waiting for MVP update...")
    try:
        # Check if MVP label appears (it replaces Views)
        # We look for the text "MVP" in the specific label container
        # The HTML has <div id="lbl-mvp">MVP</div>
        page.wait_for_selector("#lbl-mvp:has-text('MVP')", timeout=10000)
        print("MVP Label found.")

        # Check if the value is updated (User ...)
        # <div id="stat-mvp">Name (Points)</div>
        # Initially 0, then updates.
        page.wait_for_function("document.getElementById('stat-mvp').innerText !== '0'", timeout=10000)
        print("MVP Value updated.")

        mvp_text = page.locator("#stat-mvp").inner_text()
        print(f"MVP Text: {mvp_text}")

    except Exception as e:
        print(f"MVP not found or timed out: {e}")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/dashboard_mvp.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify(page)
        finally:
            browser.close()
