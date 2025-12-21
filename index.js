const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("MovieMate Backend Running");
});

const PORT = 2112;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
