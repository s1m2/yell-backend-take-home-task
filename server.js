require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const expressWinston = require("express-winston");
const responseTime = require("response-time");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 4242;
const domain = process.env.ENVIRONMENT === "production" ? process.env.PRODUCTION_DOMAIN : process.env.LOCAL_DOMAIN;
const businesses = require("./data/businesses.json");
const locations = require("./data/locations.json");
const classifications = require("./data/classifications.json");

const corsOptions = {
  origin: domain,
  optionsSuccessStatus: 200,
  methods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  credentials: true,
}

app.use(
  rateLimit({
    windowMs: 15* 60 * 1000,
    max: 500, // 500 requests,
  })
);
app.use(helmet());
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(responseTime());
app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.json(),
    statusLevels: true,
    meta: false,
    msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: true,
    ignoreRoute: () => false
  })
);

app.get("/api/v1/businesses", (req, res) => {
  res.status(200).json(businesses);
});

app.get("/api/v1/business/:businessId/jobs", (req, res) => {
  let business = businesses.businesses.find(business => business.id === Number(req.params.businessId));

  if (!business) {
    res.status(404).json({ message: "Business not found" });
    return;
  }

  const jobs = require("./data/jobs.json");
  const availableJobs = jobs.jobs.map(job => {
    if (business.classifications.includes(job.classification) && business.locations_served.includes(job.location)) {
      return {
        ...job,
        location: locations.locations.find(location => location.id === job.location),
        classification: classifications.classifications.find(classification => classification.id === job.classification)
      };
    }
  }).filter(Boolean); ;

  res.status(200).json(availableJobs);
});



app.listen(PORT, () => console.log(`Running on port ${PORT}`));
