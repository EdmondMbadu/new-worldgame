# SEO Deployment Checklist - NewWorld Game

## Pre-Deployment Verification

### Build Test
- [ ] Run `ng build --configuration production`
- [ ] Verify no build errors
- [ ] Check dist folder contains:
  - [ ] index.html (with enhanced meta tags)
  - [ ] sitemap.xml
  - [ ] robots.txt

### File Verification
- [ ] Check `dist/index.html` has all meta tags
- [ ] Verify JSON-LD structured data in index.html
- [ ] Confirm sitemap.xml has correct URLs
- [ ] Confirm robots.txt has correct directives

---

## Deployment Steps

### 1. Build Application
```bash
cd /Users/edmondmbadu/repo/new-worldgame
ng build --configuration production
```

### 2. Deploy to Firebase
```bash
firebase deploy --only hosting
```

### 3. Verify Deployment
- [ ] Visit: https://new-worldgame.web.app
- [ ] Check page title in browser tab
- [ ] View page source - verify meta tags present
- [ ] Test: https://new-worldgame.web.app/sitemap.xml
- [ ] Test: https://new-worldgame.web.app/robots.txt

---

## Post-Deployment SEO Setup

### Google Search Console (Priority: HIGH)

#### Submit Property
- [ ] Go to [Google Search Console](https://search.google.com/search-console)
- [ ] Add property: `new-worldgame.web.app`
- [ ] Verify ownership (Firebase auto-verifies via Google account)

#### Submit Sitemap
- [ ] Navigate to **Sitemaps** section
- [ ] Add sitemap URL: `https://new-worldgame.web.app/sitemap.xml`
- [ ] Click Submit
- [ ] Verify status shows "Success"

#### Request Indexing (Do for each key page)
- [ ] Homepage: `https://new-worldgame.web.app/`
- [ ] Landing: `https://new-worldgame.web.app/landing`
- [ ] Plans: `https://new-worldgame.web.app/plans`
- [ ] Tournament: `https://new-worldgame.web.app/tournament-landing`
- [ ] Workshop: `https://new-worldgame.web.app/workshop`
- [ ] Bucky: `https://new-worldgame.web.app/bucky`

Steps for each:
1. Go to **URL Inspection**
2. Paste URL
3. Click **Request Indexing**
4. Wait for confirmation

### Google Analytics (Already Integrated)
- [ ] Verify GA4 property `G-EY8CMW923L` is receiving data
- [ ] Set up custom events for key actions (signup, tournament join)
- [ ] Enable Search Console integration in GA4

### Bing Webmaster Tools (Priority: MEDIUM)

- [ ] Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Add site: `new-worldgame.web.app`
- [ ] Submit sitemap: `https://new-worldgame.web.app/sitemap.xml`
- [ ] Request indexing for key pages

---

## Testing & Validation

### Meta Tags Testing
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  - Test URL: https://new-worldgame.web.app
  - Verify image, title, description appear

- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator)
  - Test URL: https://new-worldgame.web.app
  - Verify card preview looks good

- [ ] [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  - Test URL: https://new-worldgame.web.app
  - Clear cache if needed

### Structured Data Testing
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results)
  - Test URL: https://new-worldgame.web.app
  - Verify EducationalOrganization schema is detected
  - Check for errors or warnings

### Performance Testing
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/)
  - Test mobile and desktop
  - Target: 90+ score
  - Check Core Web Vitals

- [ ] [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
  - Verify site is mobile-friendly

### Sitemap Validation
- [ ] [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
  - Enter: https://new-worldgame.web.app/sitemap.xml
  - Verify no errors

---

## Week 1 Monitoring

### Day 1-2
- [ ] Check Google Search Console for crawl activity
- [ ] Verify sitemap status (processed vs pending)
- [ ] Monitor for crawl errors

### Day 3-5
- [ ] Check if homepage is indexed: `site:new-worldgame.web.app` in Google
- [ ] Review Coverage report in Search Console
- [ ] Check for any structured data issues

### Day 7
- [ ] Test branded search: "NewWorld Game" in Google
- [ ] Test branded search: "New World Game" in Google
- [ ] Check search appearance (title, description)
- [ ] Review first week analytics data

---

## Week 2-4 Monitoring

### Weekly Tasks
- [ ] Check Google Search Console Performance report
  - Total clicks
  - Total impressions
  - Average CTR
  - Average position

- [ ] Monitor keyword rankings:
  - "NewWorld Game"
  - "New World Game"
  - "NWG educational game"
  - Track changes week-over-week

- [ ] Review pages with errors in Coverage report
- [ ] Check for mobile usability issues

---

## Ongoing Optimization

### Content Creation (Monthly)
- [ ] Publish 2-4 blog posts with SEO optimization
- [ ] Update existing pages with fresh content
- [ ] Add new tournament announcements
- [ ] Create success stories / case studies

### Link Building (Monthly)
- [ ] Reach out to educational blogs for partnerships
- [ ] Submit to educational software directories
- [ ] Share updates on social media
- [ ] Engage with educational communities

### Technical Maintenance (Monthly)
- [ ] Update sitemap.xml lastmod dates
- [ ] Review and fix broken links
- [ ] Check page load speeds
- [ ] Monitor Core Web Vitals
- [ ] Review and update meta descriptions based on CTR

---

## Quick Win Opportunities

### Immediate Actions (Week 1)
1. **Share on Social Media**
   - Post on LinkedIn, Twitter, Facebook with proper hashtags
   - Tag educational influencers
   - Use keywords: #NewWorldGame #GlobalChallenges #EdTech

2. **Email Signature**
   - Add website link to team email signatures
   - Include tagline with keywords

3. **Business Listings**
   - Google Business Profile (if applicable)
   - Educational directories
   - EdTech platforms

### Short-term Actions (Month 1)
1. **Content Expansion**
   - Write "How NewWorld Game Works" guide
   - Create "Getting Started" tutorial
   - Publish tournament success stories

2. **Video Content**
   - Create YouTube channel
   - Upload demo videos
   - Optimize video titles/descriptions with keywords

3. **Press Release**
   - Announce platform to education news sites
   - Highlight unique Buckminster Fuller connection
   - Share tournament opportunities

---

## Troubleshooting Common Issues

### Sitemap Not Being Read
✅ **Solution:**
- Verify URL returns XML (not 404)
- Check Firebase hosting headers are correct
- Resubmit in Search Console
- Wait 24-48 hours for processing

### Pages Not Indexing
✅ **Solution:**
- Use URL Inspection tool to check specific issues
- Verify robots.txt isn't blocking
- Check page has sufficient unique content
- Request indexing again
- Check for noindex tags accidentally added

### Poor Rankings After 2+ Weeks
✅ **Solution:**
- Review competitor pages for "NewWorld Game"
- Add more unique content to homepage
- Build quality backlinks from .edu sites
- Increase social media presence
- Ensure technical SEO is perfect (no errors)

### Meta Tags Not Showing in Search
✅ **Solution:**
- Google may rewrite meta descriptions - this is normal
- Ensure descriptions are 150-160 characters
- Make them compelling and click-worthy
- Include primary keywords naturally
- Wait for Google to re-crawl (can take 2-4 weeks)

---

## Success Criteria

### Week 1
- ✅ Site is indexed by Google
- ✅ Sitemap is processed
- ✅ No crawl errors
- ✅ Homepage appears for "NewWorld Game" search

### Month 1
- ✅ Top 10 for "NewWorld Game"
- ✅ Top 10 for "New World Game"
- ✅ 20+ pages indexed
- ✅ Rich snippets showing in search results

### Month 3
- ✅ Position #1-3 for primary keywords
- ✅ 100+ organic visitors per week
- ✅ 5+ secondary keywords ranking
- ✅ CTR above 5%

---

## Emergency Contacts & Resources

### Documentation
- Full guide: `SEO_IMPLEMENTATION_GUIDE.md`
- This checklist: `SEO_DEPLOYMENT_CHECKLIST.md`

### Key Files
- SEO Service: `src/app/services/seo.service.ts`
- Sitemap: `src/sitemap.xml`
- Robots: `src/robots.txt`
- Main HTML: `src/index.html`

### Support Resources
- [Google Search Central Help](https://support.google.com/webmasters)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Angular SEO Guide](https://angular.io/guide/prerendering)

---

## Notes
- SEO results take time (2-12 weeks typically)
- Branded searches ("NewWorld Game") rank faster than generic terms
- Quality content + backlinks = long-term success
- Monitor weekly, optimize monthly, be patient

---

**Ready to deploy? Start with the Pre-Deployment Verification section above!**

**Last Updated:** December 27, 2025
