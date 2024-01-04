const express = require('express');
const fs = require('fs');
// const axios = require('axios');
const speech = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = 3005;
app.use(cors());

const client = new speech.SpeechClient();

app.use(express.json()); // Parse JSON bodies

const storage = multer.memoryStorage(); // You can also use multer.diskStorage if you want to save files to disk
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB limit, adjust as needed

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Access the file details
    const files = req.file;
    const fileName = files.originalname;
    const fileSize = files.size;

    // Process the file as needed (e.g., save to disk, upload to cloud storage, etc.)

    // Log success message
    console.log('File uploaded successfully');
    console.log('File Details:', {
      fileName: fileName,
      fileSize: fileSize,
    });

    // Prepare data for Google Speech-to-Text
    const audioBytes = files.buffer.toString('base64');
    const audio = {
      content: audioBytes,
    };

    const sttConfig = {
      enableAutomaticPunctuation: false,
      encoding: 'LINEAR16',
      sampleRateHertz: 41000,
      languageCode: 'en-US',
      model: 'default',
    };

    const request = {
      audio: audio,
      config: sttConfig,
    };

    // Perform Google Speech-to-Text
    try {
      const [response] = await client.recognize(request);

      if (!response) {
        return res.status(500).json({ error: 'No response from Google API' });
      }

      const transcript = response.results
        .map((result) => result.alternatives[0].transcript)
        .join('\\n');

      console.log('RESULT:::', transcript);

      // Send a single response
      res.json({
        message: 'File uploaded successfully',
        fileName: fileName,
        fileSize: fileSize,
        transcript: transcript,
      });
    } catch (error) {
      console.error('Error in Google API request:', error);
      res.status(500).json({ error: 'Error in Google API request' });
    }
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/speech', async (req, res) => {
  const data = req.body;
  console.log("REQ::",req.body)

  if (data.file) {
    console.log("DATA::",req.body)
    const name = data.file.originalname;
    const path = __dirname + "/uploads/" + name;
    const encodedPath = __dirname + "/uploads/encoded_" + name;

    const file = fs.createWriteStream(path);
    file.on('error', (err) => console.error(err));
    data.file.buffer.pipe(file);

    file.on('finish', async () => {
      const ret = {
        filename: data.name,
        headers: data.file.headers
      };

      ffmpeg()
        .input(path)
        .outputOptions([
          '-f s16le',
          '-acodec pcm_s16le',
          '-vn',
          '-ac 1',
          '-ar 41k',
          '-map_metadata -1'
        ])
        .save(encodedPath)
        .on('end', async () => {
          const savedFile = await fs.promises.readFile(encodedPath);

          if (!savedFile) {
            return res.status(500).json({ error: 'File cannot be read' });
          }

          const audioBytes = savedFile.toString('base64');
          const audio = {
            content: audioBytes,
          };

          const sttConfig = {
            enableAutomaticPunctuation: false,
            encoding: "LINEAR16",
            sampleRateHertz: 41000,
            languageCode: "en-US",
            model: "default"
          };

          const request = {
            audio: audio,
            config: sttConfig,
          };

          try {
            console.log("TEST:::::")
            const [response] = await client.recognize(request);

            if (!response) {
              return res.status(500).json({ error: 'No response from Google API' });
            }

            const transcript = response.results
              .map(result => result.alternatives[0].transcript)
              .join('\\n');

            fs.unlinkSync(path);
            fs.unlinkSync(encodedPath);

            return res.json({ ...ret, transcript });
          } catch (error) {
            console.log('GEEEE::: ', error);
            return res.status(500).json({ error: 'Error in Google API request: ' + error.message });
          }
        });
    });
  } else {
    return res.status(400).json({ error: 'File not provided in the request' });
  }
});

app.get('/test', (req, res) => {
      res.json({ message: 'Server response: Server available' });
    });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// 'use strict';

// const Hapi = require('@hapi/hapi');

// const init = async () => {
//     const server = Hapi.server({
//         port: 3005,
//         host: 'localhost'
//     });

//     server.route({
//         method: 'GET',
//         path: '/test',
//         handler: (request, h) => {
//             console.log("XXXXXX")
//             return 'Hello World!';
//         }
//     });

//     await server.start();
//     console.log('Server running on %s', server.info.uri);
// };

// process.on('unhandledRejection', (err) => {
//     console.log(err);
//     process.exit(1);
// });

// init();

// const express = require("express"); 

// const app = express(); 
// const PORT = 3000; 

// app.get("/test", (req, res) => { 
//     res.send("It's Working!"); 
// }); 

// app.listen(PORT, () => { 
//     console.log(`API is listening on port ${PORT}`); 
// });


// const express = require('express');
// const app = express();
// const port = 3000;

// app.get('/api/data', (req, res) => {
//   res.json({ message: 'Server response: Server available' });
// });

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });