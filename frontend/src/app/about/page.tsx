"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import ToolHeader from "@/components/ToolHeader";
import { useLanguage } from "@/lib/language";

const sourceCodeUrl = "https://github.com/piyushdudhe8-code/Earth-Pulse-recreat";

export default function AboutPage() {
  const { language } = useLanguage();
  const hindi = language === "hi";

  return (
    <div className="tool-page">
      <ToolHeader currentPage="About Earth Pulse" />
      <main className="tool-main methodology-page">
        <section className="tool-intro" aria-labelledby="about-title">
          <p className="section-kicker">{hindi ? "हमारा उद्देश्य" : "ABOUT THE PROJECT"}</p>
          <h1 id="about-title">{hindi ? "Earth Pulse के बारे में" : "About Earth Pulse"}</h1>
          <p>
            {hindi
              ? "Earth Pulse एक स्वतंत्र NASA Space Apps Challenge परियोजना है। यह बिना खाते के, सरल भाषा में पृथ्वी के डेटा को समझने में मदद करता है।"
              : "Earth Pulse is an independent NASA Space Apps Challenge project. It helps people explore Earth data in plain language, without creating an account."}
          </p>
          <p className="methodology-callout">
            {hindi
              ? "यह NASA का आधिकारिक उत्पाद नहीं है।"
              : "This is not an official NASA product."}
          </p>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="experiences-title">
          <h2 id="experiences-title">{hindi ? "दो मुख्य अनुभव" : "Two ways to explore"}</h2>
          <ul>
            <li>
              <strong>{hindi ? "अपने आसपास की जाँच करें" : "Investigate My Surroundings"}:</strong>{" "}
              {hindi
                ? "कोई जगह चुनें और वहाँ के NASA POWER तापमान या वर्षा के ऐतिहासिक रुझान देखें।"
                : "Choose a place and explore historical NASA POWER temperature or precipitation trends for its nearest grid cell."}
            </li>
            <li>
              <strong>{hindi ? "भविष्य की कल्पना करें" : "Imagine the Future"}:</strong>{" "}
              {hindi
                ? "NASA जलवायु मॉडल और चुने हुए परिदृश्य के आधार पर सवाल देखें। मॉडल सहमति को संभावना नहीं कहा जाता।"
                : "Compare a threshold question with NASA climate-model projections under a selected scenario. Model agreement is not presented as probability."}
            </li>
          </ul>
          <nav className="methodology-actions" aria-label={hindi ? "मुख्य अनुभव" : "Main experiences"}>
            <Link className="tool-primary-button" href="/investigate">
              {hindi ? "ऐतिहासिक डेटा देखें" : "Explore historical data"}
            </Link>
            <Link className="tool-secondary-button" href="/future">
              {hindi ? "जलवायु प्रक्षेपण देखें" : "Explore projections"}
            </Link>
          </nav>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="about-sources-title">
          <h2 id="about-sources-title">{hindi ? "डेटा स्रोत" : "Data sources"}</h2>
          <ul className="methodology-source-list">
            <li>
              <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a>
              <p>
                {hindi
                  ? "ऐतिहासिक तापमान और वर्षा डेटा, जो वर्तमान में MERRA-2 री-एनालिसिस पर आधारित है।"
                  : "Historical temperature and precipitation; the connected meteorological record is based on MERRA-2 reanalysis."}
              </p>
            </li>
            <li>
              <a href="https://power.larc.nasa.gov/docs/services/api/projection/" target="_blank" rel="noreferrer">NASA POWER Projection API</a>
              <p>
                {hindi
                  ? "परिदृश्य-आधारित मॉडल प्रक्षेपण, जिन्हें ऐतिहासिक रिकॉर्ड से अलग दिखाया जाता है।"
                  : "Scenario-based model projections, kept visually separate from historical records."}
              </p>
            </li>
            <li>
              <a href="https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html" target="_blank" rel="noreferrer">NASA CMR</a>
              <p>
                {hindi
                  ? "डेटासेट खोज के लिए मेटाडेटा सूची; यहाँ से डेटा डाउनलोड या विश्लेषण नहीं किया जाता।"
                  : "A metadata catalogue for dataset discovery; Earth Pulse does not download or analyze data from these search results."}
              </p>
            </li>
            <li>
              <a href="https://disc.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA Earthdata / GES DISC</a>
              <p>
                {hindi
                  ? "CMR में मिलने वाले डेटा संग्रहों के लिए आधिकारिक संग्रह स्थान; कुछ डेटा के लिए Earthdata खाते की ज़रूरत हो सकती है।"
                  : "An official archive linked from catalogue records; some datasets may require a NASA Earthdata account."}
              </p>
            </li>
          </ul>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="about-method-title">
          <h2 id="about-method-title">{hindi ? "तरीके और सीमाएँ" : "Method and limitations"}</h2>
          <p>
            {hindi
              ? "ऐतिहासिक विश्लेषण पूरे वर्षों के डेटा का उपयोग करके Mann–Kendall जाँच, Sen’s slope और रैखिक प्रतिगमन करता है। गायब डेटा को गिना जाता है, भरा नहीं जाता।"
              : "Historical analysis uses complete-year values with Mann–Kendall testing, Sen's slope, and linear regression. Missing data are reported, not filled in."}
          </p>
          <ul>
            <li>
              {hindi
                ? "स्थान के लिए NASA का निकटतम ग्रिड सेल उपयोग होता है; यह घर का सीधा माप या शहर का औसत नहीं है।"
                : "A location uses NASA's nearest grid cell, not a direct measurement at a home or a city-wide average."}
            </li>
            <li>
              {hindi
                ? "ऐतिहासिक POWER मौसम डेटा MERRA-2 री-एनालिसिस है, सीधा उपग्रह माप नहीं।"
                : "Historical POWER meteorology is MERRA-2 reanalysis, not a direct satellite measurement."}
            </li>
            <li>
              {hindi
                ? "मासिक डेटा दैनिक चरम नहीं दिखाता; रुझान का कारण इससे तय नहीं होता।"
                : "Monthly data cannot show daily extremes, and a trend alone does not identify a cause."}
            </li>
            <li>
              {hindi
                ? "भविष्य के परिणाम चुने गए परिदृश्य के मॉडल प्रक्षेपण हैं, आधिकारिक पूर्वानुमान नहीं।"
                : "Future results are model projections under a selected scenario, not an official forecast."}
            </li>
          </ul>
          <Link className="tool-secondary-button" href="/methodology">
            {hindi ? "विस्तृत तरीके पढ़ें" : "Read the full methodology"}
          </Link>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="team-title">
          <h2 id="team-title">{hindi ? "टीम" : "Team"}</h2>
          <p>
            {hindi
              ? "टीम की जानकारी जोड़ने के लिए ये स्थान रखे गए हैं।"
              : "Placeholder fields for the project team; add names and roles before a public introduction if desired."}
          </p>
          <ul>
            <li>{hindi ? "टीम सदस्य का नाम — भूमिका" : "Team member name — role"}</li>
            <li>{hindi ? "टीम सदस्य का नाम — भूमिका" : "Team member name — role"}</li>
          </ul>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="source-code-title">
          <h2 id="source-code-title">{hindi ? "स्रोत कोड" : "Source code"}</h2>
          <p>
            {hindi
              ? "कोड और परियोजना का विकास इतिहास GitHub पर देखें।"
              : "Explore the project source and development history on GitHub."}
          </p>
          <a href={sourceCodeUrl} target="_blank" rel="noreferrer">
            {hindi ? "GitHub पर Earth Pulse स्रोत कोड खोलें" : "View Earth Pulse source code on GitHub"}
          </a>
        </section>
      </main>
      <Footer>
        {hindi
          ? "हम स्रोत और सीमाएँ साफ़ बताते हैं ताकि आप डेटा को सोच-समझकर समझें।"
          : "We explain sources and limits so you can make sense of the data carefully."}
      </Footer>
    </div>
  );
}
