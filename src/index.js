const express = require('express');
const bodyParser = require('body-parser');
const {fetchLogoUrl, convertToPng,findLogo} = require('../src/controller/controller.js')
const fs = require("fs")
const {LogoScrape} = require('logo-scrape');

const app = express();
const port = 3000;


// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.post('/get-logo-any', async (req, res) => {
    if (!req.body.url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    const logoUrl = await findLogo(req.body.url);
    if (logoUrl) {
        res.send(logoUrl );
    } else {
        res.status(404).send({ error: 'Logo not found' });
    }
});

app.post('/get-logo', async (req, res) => {
    if (!req.body.url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    const logoUrl = await fetchLogoUrl(req.body.url);
    if (!logoUrl || logoUrl === 'Logo not found') {
        return res.status(404).send({ error: 'Logo not found' });
    }

    // Check if the logo is already a PNG
    if (logoUrl.endsWith('.png')) {
        return res.send({ logoUrl });
    } else {
        // Convert to PNG
        const convertedLogoPath = await convertToPng(logoUrl);
        return res.sendFile(convertedLogoPath, {}, (err) => {
            // Cleanup: delete the converted file after sending it
            fs.unlinkSync(convertedLogoPath);
        });
    }
});


app.post('/logo', async (req, res) => {
    if (!req.body.url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    let logo = await LogoScrape.getLogo(req.body.url)
    return res.end({ logo })
    
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
