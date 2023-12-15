const express = require('express');
const fs = require('fs');
// const axios = require('axios');
const speech = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3005;
app.use(cors());

const client = new speech.SpeechClient();

app.use(express.json()); // Parse JSON bodies

app.post('/speech', async (req, res) => {
  const data = req.body;
  console.log("REQ::",req.body)

  if (data.file) {
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
            return res.status(500).json({ error: 'Error in Google API request' });
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