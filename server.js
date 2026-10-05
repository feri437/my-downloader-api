const express = require('express');
const ytDlp = require('yt-dlp-exec');
const app = express();

app.use(express.json());

app.get('/download', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const output = await ytDlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    });

    let bestFormat = null;
    if (output.formats && output.formats.length > 0) {
      const videoFormats = output.formats.filter(f => 
        f.vcodec !== 'none' && f.acodec !== 'none'
      );
      
      if (videoFormats.length > 0) {
        bestFormat = videoFormats
          .filter(f => f.height && f.height <= 720)
          .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        
        if (!bestFormat) {
          bestFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        }
      }
    }

    if (!bestFormat) {
      const audioFormats = output.formats.filter(f => f.acodec !== 'none');
      if (audioFormats.length > 0) {
        bestFormat = audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
      }
    }

    if (!bestFormat || !bestFormat.url) {
      return res.status(404).json({ error: 'No downloadable format found' });
    }

    res.json({
      success: true,
      url: bestFormat.url,
      title: output.title,
      duration: output.duration,
      ext: bestFormat.ext || 'mp4'
    });

  } catch (error) {
    console.error('yt-dlp error:', error.message);
    res.status(500).json({ error: 'Download failed: ' + error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'API is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
