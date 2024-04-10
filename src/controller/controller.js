const puppeteer = require('puppeteer');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchLogoUrl(websiteUrl) {
    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('img', { timeout: 10000 }).catch(() => console.log("Timeout waiting for images."));

        const logoSelector = `
            img[src*="logo"], img[alt*="logo"], img[id*="logo"],
            svg:not([class*="icon"]):not([id*="icon"]),
            img[class*="logo"], div[class*="logo"],
            header img, .header img, #header img,
            img[role="img"][alt*="logo"]
        `.replace(/\s+/g, ' ').trim();

        const logoUrl = await page.evaluate((selector) => {
            const elements = Array.from(document.querySelectorAll(selector));
            const logoElement = elements.find(el => (el.naturalWidth > 50 && el.naturalHeight > 50) || el.offsetWidth > 50 || el.offsetHeight > 50) || elements[0];
            if (!logoElement) return null;
            return logoElement.src || logoElement.href || null;
        }, logoSelector);

        return logoUrl ? (new URL(logoUrl, websiteUrl)).href : null; // Ensures the URL is absolute
    } catch (error) {
        console.error('Error fetching logo:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}




async function convertToPng(imageUrl) {
    // Fetch the image using axios and convert it to PNG format
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const outputFilePath = path.join(__dirname, `temp-${Date.now()}.png`);

    await sharp(buffer)
        .png()
        .toFile(outputFilePath);

    return outputFilePath;
}


async function fetchFavicon(websiteUrl) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(websiteUrl, { waitUntil: 'networkidle2' });

        const faviconUrl = await page.evaluate(() => {
            const link = document.querySelector(`link[rel='icon']`) || document.querySelector(`link[rel='shortcut icon']`);
            return link ? link.href : null;
        });

        await browser.close();
        return faviconUrl ? (new URL(faviconUrl, websiteUrl)).href : null;
    } catch (error) {
        console.error('Error fetching favicon:', error);
        return null;
    }
}


// async function fetchLogoViaClearbit(domain) {
//     const apiKey = 'YOUR_CLEARBIT_API_KEY'; // Replace with your API key
//     const url = `https://logo.clearbit.com/${domain}`;

//     try {
//         const response = await axios.get(url, {
//             headers: { 'Authorization': `Bearer ${apiKey}` }
//         });
//         return response.status === 200 ? url : null;
//     } catch (error) {
//         console.error('Error fetching logo via Clearbit:', error);
//         return null;
//     }
// }


async function fetchLogoFromMetaTags(websiteUrl) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(websiteUrl, { waitUntil: 'networkidle2' });

        const metaLogoUrl = await page.evaluate(() => {
            const ogImage = document.querySelector(`meta[property='og:image']`);
            const twitterImage = document.querySelector(`meta[name='twitter:image']`);
            return ogImage ? ogImage.content : (twitterImage ? twitterImage.content : null);
        });

        await browser.close();
        return metaLogoUrl ? (new URL(metaLogoUrl, websiteUrl)).href : null;
    } catch (error) {
        console.error('Error fetching logo from meta tags:', error);
        return null;
    }
}


async function fetchLogoFromCSS(websiteUrl) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(websiteUrl, { waitUntil: 'networkidle2' });

        const backgroundImageUrl = await page.evaluate(() => {
            const elementsWithBackground = Array.from(document.querySelectorAll('*')).filter(
                el => getComputedStyle(el).backgroundImage !== 'none'
            );

            const logoElement = elementsWithBackground.find(el => getComputedStyle(el).backgroundImage.includes('logo'));
            if (!logoElement) return null;

            const backgroundImage = getComputedStyle(logoElement).backgroundImage;
            const urlMatch = backgroundImage.match(/url\("?(.+?)"?\)/);
            return urlMatch ? urlMatch[1] : null;
        });

        await browser.close();
        return backgroundImageUrl ? (new URL(backgroundImageUrl, websiteUrl)).href : null;
    } catch (error) {
        console.error('Error fetching logo from CSS:', error);
        return null;
    }
}


async function findLogo(websiteUrl) {
    let logoUrl;

    const methods = [fetchLogoUrl, fetchFavicon, fetchLogoFromMetaTags, fetchLogoFromCSS];

    for (let method of methods) {
        logoUrl = await method(websiteUrl);
        if (logoUrl && (logoUrl.endsWith('.png') || logoUrl.endsWith('.svg'))) {
            return logoUrl; 
        }
    }

    return null;
}
module.exports = {fetchLogoUrl, convertToPng,findLogo}
