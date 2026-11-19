"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import ToolHeader from "@/components/ToolHeader";
import { useLanguage } from "@/lib/language";

const sources = [
  {
    name: "NASA POWER",
    url: "https://power.larc.nasa.gov/",
    en: "The app's connected source for monthly temperature and precipitation at a point.",
    hi: "ऐप में किसी जगह के मासिक तापमान और वर्षा का जुड़ा हुआ स्रोत।",
  },
  {
    name: "MERRA-2",
    url: "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
    en: "A NASA atmospheric reanalysis used in the current POWER records. It combines observations with a weather model; it is not a direct measurement at every map point.",
    hi: "वर्तमान POWER रिकॉर्ड में इस्तेमाल किया गया NASA वायुमंडलीय री-एनालिसिस। इसमें माप और मौसम मॉडल दोनों शामिल हैं; हर नक्शा बिंदु पर सीधा माप नहीं है।",
  },
  {
    name: "NASA Earthdata / GES DISC",
    url: "https://disc.gsfc.nasa.gov/",
    en: "A NASA archive for Earth science data. This site is a place to explore, not a connected source for the current calculations.",
    hi: "पृथ्वी विज्ञान डेटा का NASA संग्रह। यह स्रोत खोजने की जगह है, मौजूदा गणनाओं से जुड़ा डेटा स्रोत नहीं।",
  },
  {
    name: "GPM IMERG",
    url: "https://gpm.nasa.gov/data/imerg",
    en: "NASA precipitation estimates from a satellite mission. It is not connected to the current analysis yet.",
    hi: "उपग्रह मिशन से NASA के वर्षा अनुमान। यह अभी मौजूदा विश्लेषण से जुड़ा नहीं है।",
  },
];

export default function MethodologyPage() {
  const { language } = useLanguage();
  const hindi = language === "hi";

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Methodology & Data Sources" />
      <main className="tool-main methodology-page">
        <section className="tool-intro" aria-labelledby="methodology-title">
          <p className="section-kicker">{hindi ? "खुला विज्ञान" : "OPEN SCIENCE"}</p>
          <h1 id="methodology-title">
            {hindi ? "तरीके और डेटा स्रोत" : "Methodology & Data Sources"}
          </h1>
          <p>
            {hindi
              ? "यहाँ सरल भाषा में बताया गया है कि पृथ्वी पल्स डेटा कहाँ से लेता है और उससे क्या निकालता है।"
              : "A plain-language guide to where Earth Pulse gets data and what it does with it."}
          </p>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="data-source-title">
          <h2 id="data-source-title">{hindi ? "डेटा कहाँ से आता है?" : "Where does the data come from?"}</h2>
          <p>
            {hindi
              ? "वर्तमान विश्लेषण NASA POWER के मासिक डेटा का उपयोग करता है: 2 मीटर के पास हवा का तापमान और सुधारी गई वर्षा। कोई पर्यावरणीय संख्या बनाई या भरकर नहीं दी जाती।"
              : "Current analyses use NASA POWER monthly parameters T2M and PRECTOTCORR. NASA POWER reports these meteorological records from MERRA-2 reanalysis. The app does not create or fill in environmental values."}
          </p>
          <ul className="methodology-source-list">
            {sources.map((source) => (
              <li key={source.name}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
                <p>{hindi ? source.hi : source.en}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="trend-method-title">
          <h2 id="trend-method-title">{hindi ? "हम रुझान कैसे देखते हैं?" : "How do we look for a trend?"}</h2>
          <ol>
            <li>
              {hindi
                ? "हम चुने हुए निर्देशांकों के निकटतम NASA ग्रिड सेल के लिए मासिक डेटा लाते हैं। NASA का जवाब नवीनतम उपलब्ध पूरे साल पहचानता है; फिर विश्लेषण के लिए सबसे नए 20 पूरे साल चुनता है।"
                : "We request monthly values for the nearest NASA grid cell to the selected coordinates. NASA's response identifies the latest complete year; the analysis then selects the latest 20 complete years."}
            </li>
            <li>
              {hindi
                ? "खाली या अधूरे महीनों को गिनते हैं और अधूरे सालों को रुझान जाँच में शामिल नहीं करते।"
                : "We count missing months and leave incomplete years out of the trend test."}
            </li>
            <li>
              {hindi
                ? "तापमान और सुधारित वर्षा दर के लिए महीनों का दिनों के अनुसार भारित औसत निकालते हैं। NASA की मूल इकाइयाँ बिना बदले रखी जाती हैं। पूरे साल देखने से मौसम के उतार-चढ़ाव का असर कम होता है।"
                : "We calculate a day-weighted annual mean for temperature and corrected precipitation rate. NASA's original units are retained without conversion. Whole-year values reduce the effect of seasons."}
            </li>
            <li>
              {hindi
                ? "Mann–Kendall जाँच देखती है कि वर्षों में लगातार ऊपर या नीचे जाने का संकेत है या नहीं। Sen’s slope बदलाव की दर का एक मजबूत अनुमान देती है।"
                : "The Mann–Kendall test checks for a consistent upward or downward pattern across years. Sen's slope gives a robust estimate of the rate of change."}
            </li>
          </ol>
          <p className="methodology-callout">
            {hindi
              ? "सांख्यिकीय संकेत का मतलब यह नहीं कि बदलाव का कारण पता चल गया।"
              : "A statistically clear pattern does not tell us what caused the change."}
          </p>
        </section>

        <section className="tool-panel methodology-section" aria-labelledby="uncertainty-title">
          <h2 id="uncertainty-title">{hindi ? "क्या ध्यान रखना चाहिए?" : "What should I keep in mind?"}</h2>
          <ul>
            <li>
              {hindi
                ? "NASA POWER का मौसम संबंधी डेटा MERRA-2 री-एनालिसिस है: मॉडल-आधारित ग्रिड रिकॉर्ड, आपके घर का थर्मामीटर नहीं।"
                : "NASA POWER's meteorological data are MERRA-2 reanalysis: a model-derived grid record, not a thermometer at your home."}
            </li>
            <li>
              {hindi
                ? "मासिक डेटा किसी खास दिन की गर्मी या बारिश नहीं बताता।"
                : "Monthly data cannot tell you the exact temperature or rainfall on a particular day."}
            </li>
            <li>
              {hindi
                ? "एक-दूसरे के साथ बदलते दो रिकॉर्ड यह साबित नहीं करते कि एक ने दूसरे को पैदा किया।"
                : "Two records moving together do not prove that one caused the other."}
            </li>
            <li>
              {hindi
                ? "भविष्य वाला पृष्ठ चुने गए परिदृश्य के जलवायु-मॉडल प्रक्षेपणों की चुनी हुई सीमा से तुलना करता है। सीमा पूरी करने वाले उपलब्ध मॉडलों की संख्या मॉडल-सहमति है, संभावना या आधिकारिक पूर्वानुमान नहीं।"
                : "The future page compares scenario-based climate-model projections with a selected threshold. The number of available models that meet it is model agreement, not a probability or official forecast."}
            </li>
          </ul>
        </section>

        <nav className="methodology-actions" aria-label={hindi ? "जाँच के टूल" : "Investigation tools"}>
          <Link className="tool-primary-button" href="/investigate">
            {hindi ? "जाँच शुरू करें" : "Start an investigation"}
          </Link>
          <Link className="tool-secondary-button" href="/lab">
            {hindi ? "रिसर्च लैब" : "Research Lab"}
          </Link>
        </nav>
      </main>
      <Footer>
        {hindi
          ? "हम जहाँ माप और मॉडल का मेल हो, वहाँ यह बात साफ़ बताते हैं।"
          : "We say clearly when a record combines measurements and models."}
      </Footer>
    </div>
  );
}
