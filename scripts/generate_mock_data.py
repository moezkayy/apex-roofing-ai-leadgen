"""Writes data/sample_roofers.json: 50 fictional Dallas roofers in the Apify
Google Maps Scraper item shape. Deterministic (seeded). Nothing here is a real business."""
import json
import random
import re
from pathlib import Path
from urllib.parse import quote

rng = random.Random(42)

WORDS = [
    "Alder", "Banyard", "Cobalt", "Dunmore", "Elmhurst", "Fenwick", "Garnet", "Halcyon",
    "Ironbark", "Juniper", "Kestrel", "Larkspur", "Marlow", "Northgate", "Oakmont", "Pinecrest",
    "Quarry", "Redwater", "Silverleaf", "Tanglewood", "Umber", "Vantage", "Willowbrook", "Yarrow",
    "Zephyr", "Ashlar", "Brambleton", "Cinder", "Driftwood", "Emberly", "Foxglove", "Glenrock",
    "Hollis", "Ivywood", "Jasper Lane", "Knoll", "Lantern", "Mesquite Hill", "Nettle", "Orchard Row",
    "Prairie Gate", "Quillon", "Rustler", "Stonebridge", "Thistle", "Upland", "Verity", "Wrenfield",
    "Yucca Flat", "Zinnia",
]
SUFFIXES = ["Ridge Roofing", "Roofing Co", "Roof & Repair", "Roofing Pros", "Shingle Works", "Roofing Group"]
STREETS = [
    "Marlbrook", "Tindall", "Cedar Vale", "Pecan Hollow", "Larkin", "Wexford", "Ostrander",
    "Brindle", "Quarterline", "Haverty", "Sundial", "Copperfield", "Dovetail", "Mulberry Bend",
    "Fairhaven", "Greywing", "Hickory Bluff", "Kingsbury", "Laurel Crest", "Montrose",
]
STREET_TYPES = ["St", "Ave", "Dr", "Blvd", "Ln", "Way"]

# (text, stars)
REVIEWS = [
    ("Crew showed up on time and finished in one day. Roof looks great.", 5),
    ("Fair price and the estimate matched the final bill.", 5),
    ("They handled the whole insurance claim for us. Zero stress.", 5),
    ("Cleaned up every nail in the yard. Impressed.", 5),
    ("Fixed our leak and it has stayed dry through three storms.", 5),
    ("Honest about what needed replacing and what did not.", 5),
    ("Quick, careful work after the hail. Would hire again.", 5),
    ("Friendly crew, clear communication from start to finish.", 4),
    ("Good job overall. Took a day longer than quoted but they called ahead.", 4),
    ("Solid roof, decent price. Scheduling was a little tight.", 4),
    ("Helped us with the adjuster visit and got the claim approved.", 5),
    ("Replaced our whole roof in two days. Neighbors asked for their number.", 5),
    ("The owner walked the roof with me and explained everything.", 5),
    ("Great warranty and they actually honored it when a vent leaked.", 5),
    ("Professional from the first call to the final inspection.", 5),
    ("Roof looks good, though the gutters needed a touch-up after.", 4),
    ("Called three times before anyone got back to me.", 2),
    ("Waited a week for a callback just to get an estimate.", 2),
    ("They missed our estimate appointment and never called.", 1),
    ("No-show for the estimate. Had to take another day off work.", 1),
    ("The leak came back after the first heavy rain.", 1),
    ("Paid for a repair and the same spot leaked again a month later.", 2),
    ("Left shingles and nails all over the driveway.", 2),
    ("Cleanup was sloppy. Found nails in the tire two weeks later.", 1),
    ("Hard to reach by phone and the office never returns voicemails.", 2),
    ("Price was fine but the project ran a week over with no updates.", 3),
    ("Work was okay, but I had to chase them to get the invoice.", 3),
    ("Crew was great, office was disorganized. Rescheduled twice.", 3),
    ("They said they would help with insurance, then went quiet.", 2),
    ("Insurance paperwork took forever, but the roof itself is fine.", 3),
    ("Quoted a range and landed at the top of it.", 3),
    ("Decent repair work. Would like a faster response next time.", 3),
    ("Showed up late both days but did quality work.", 3),
    ("Great experience. Texted updates every morning before the crew arrived.", 5),
    ("Found storm damage the other company missed. Saved us money.", 5),
    ("Quick turnaround on an emergency tarp after a tree fell.", 5),
    ("Roofers were polite and kept the dog away from the work area.", 4),
    ("Would not recommend. Never heard back after paying the deposit.", 1),
    ("Good crew, but the estimate took ten days to arrive.", 3),
    ("Clean install and the ridge vent works well. Attic is cooler.", 5),
]

FIRST_NAMES_FOOTER = ["Licensed and insured", "Family owned", "Serving the Dallas area", "Free estimates"]
BOOKING_SCRIPTS = [
    "https://assets.calendly.com/assets/external/widget.js",
    "https://embed.housecallpro.com/widget.js",
    "https://cdn.getjobber.com/jobber.com/booking.js",
    "https://scheduler.servicetitan.com/embed.js",
]

# --- identities ---
words = rng.sample(WORDS, 50)
titles = [f"{w} {rng.choice(SUFFIXES)}" for w in words]
phone_nums = rng.sample(range(100, 200), 50)


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


# --- feature assignment with exact counts ---
order = list(range(50))
rng.shuffle(order)
no_site = set(order[:8])
sites = order[8:]
no_viewport = set(rng.sample(sites, 15))
no_booking = set(rng.sample(sites, 28))
old_year = set(rng.sample(sites, 12))
slow = set(rng.sample(sites, 10))
few_reviews = set(rng.sample(range(50), 6))


def homepage(item_slug, i, has_fb, has_ig, title, phone_num):
    head = "<head><title>%s | Dallas, TX</title>" % title
    if i not in no_viewport:
        head += '<meta name="viewport" content="width=device-width, initial-scale=1">'
    head += "</head>"
    body = ["<h1>%s</h1>" % title, "<p>%s. Roof repair and replacement across Dallas.</p>" % rng.choice(FIRST_NAMES_FOOTER)]
    if rng.random() < 0.7:
        body.append('<a href="tel:+12145550%d">Call us</a>' % phone_num)
    if i not in no_booking:
        if rng.random() < 0.6:
            body.append('<script src="%s"></script>' % rng.choice(BOOKING_SCRIPTS))
        else:
            body.append('<a href="/book">Book online</a>')
    if has_fb:
        body.append('<a href="https://facebook.com/%s">Facebook</a>' % item_slug)
    if has_ig:
        body.append('<a href="https://instagram.com/%s">Instagram</a>' % item_slug)
    year = rng.randint(2016, 2021) if i in old_year else rng.randint(2022, 2026)
    footer = "<footer>&copy; %d %s</footer>" % (year, title)
    return "<html>%s<body>%s%s</body></html>" % (head, "".join(body), footer)


items = []
for i in range(50):
    title = titles[i]
    slug = slugify(title)
    has_site = i not in no_site
    has_fb = rng.random() < 0.55
    has_ig = rng.random() < 0.35
    has_email = rng.random() < 0.4

    if i in few_reviews:
        reviews_count = rng.randint(0, 4)
    else:
        reviews_count = rng.randint(5, 420)
    score = None if reviews_count == 0 else round(rng.uniform(3.1, 4.9), 1)

    n_reviews = min(reviews_count, rng.randint(0, 5))
    reviews = []
    for text, stars in rng.sample(REVIEWS, n_reviews):
        month_index = rng.randint(0, 11)  # 2025-10 .. 2026-09
        year, month = (2025, 10 + month_index) if month_index < 3 else (2026, month_index - 2)
        reviews.append({
            "text": text,
            "stars": stars,
            "publishedAtDate": "%04d-%02d-%02dT%02d:%02d:00.000Z" % (
                year, month, rng.randint(1, 28), rng.randint(7, 20), rng.randint(0, 59)),
        })

    if has_site:
        pagespeed = rng.randint(18, 39) if i in slow else rng.randint(40, 96)
        html = homepage(slug, i, has_fb, has_ig, title, phone_nums[i])
    else:
        pagespeed = None
        html = None

    items.append({
        "title": title,
        "placeId": "mock_%03d" % (i + 1),
        "address": "%d %s %s , Dallas, TX 752%02d" % (
            rng.randint(100, 9899), rng.choice(STREETS), rng.choice(STREET_TYPES), rng.randint(1, 54)),
        "city": "Dallas",
        "state": "Texas",
        "phone": "(214) 555-0%d" % phone_nums[i],
        "website": "https://%s.example" % slug if has_site else None,
        "url": "https://www.google.com/maps/search/?api=1&query=" + quote(title, safe=""),
        "categoryName": "Roofing contractor",
        "totalScore": score,
        "reviewsCount": reviews_count,
        "permanentlyClosed": False,
        "facebooks": ["https://facebook.com/" + slug] if has_fb else [],
        "instagrams": ["https://instagram.com/" + slug] if has_ig else [],
        "emails": ["office@%s.example" % slug] if has_email else [],
        "reviews": reviews,
        "mock": {"homepageHtml": html, "pagespeedMobile": pagespeed, "ai": None},
    })

out = Path(__file__).resolve().parent.parent / "data" / "sample_roofers.json"
out.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote %d items to %s" % (len(items), out))
