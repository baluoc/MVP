
from playwright.sync_api import sync_playwright

def verify(page):
    page.goto("http://localhost:5175")
    page.wait_for_timeout(2000)
    page.screenshot(path="verification/dashboard.png")
    print("Screenshot taken")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
