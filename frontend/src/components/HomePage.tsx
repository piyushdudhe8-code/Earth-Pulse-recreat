"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Language, useLanguage } from "@/lib/language";

const copy = {
  en: {
    eyebrow: "OUR PLANET. YOUR PLACE.",
    headline: "The Earth is changing. Let's see how, where you live.",
    subtext: "Explore real NASA data in simple words. No science degree needed.",
    surroundingsTitle: "Investigate My Surroundings",
    surroundingsDescription:
      "Use your location to see how temperature and rainfall changed over the last 20 years.",
    futureTitle: "Imagine the Future",
    futureDescription:
      "Ask a yes/no question about a future climate scenario and compare it with NASA model projections.",
    howTitle: "How it works",
    step1Title: "Pick a place",
    step1: "Choose somewhere on Earth that matters to you.",
    step2Title: "We get real NASA data",
    step2: "We use model-based historical climate data and future climate-model projections.",
    step3Title: "You see the story",
    step3: "Clear pictures and plain words help make sense of change.",
    toolsTitle: "Explore more tools",
    researchTitle: "Research Assistant",
    researchDescription: "Get help understanding Earth data and science words.",
    variablesTitle: "Multi-Variable Investigation",
    variablesDescription: "Explore how different parts of Earth's climate connect.",
    reportTitle: "Research Report Generator",
    reportDescription: "Turn your investigation into a clear, shareable report.",
    dataTitle: "Our data: what's connected and what's a reference",
    activeDataTitle: "Connected to Earth Pulse features",
    referenceDataTitle: "Reference only — not used in current calculations",
    power: "NASA POWER — active source of the historical monthly temperature and corrected-precipitation data used by Earth Pulse. These records are based on MERRA-2 model reanalysis, not direct measurements at your selected location.",
    projection: "NASA POWER Projection API — active source for scenario-based future climate-model projections, not observations or a weather forecast.",
    cmr: "NASA CMR — active catalogue search for dataset metadata only; Earth Pulse does not download or analyze the listed datasets.",
    earthdata: "NASA Earthdata / GES DISC — an archive and discovery resource, not a data feed for Earth Pulse's current calculations.",
    gpm: "GPM IMERG — NASA precipitation estimates listed for reference; they are not integrated into the current analyses.",
    note:
      "Historical temperature and precipitation analyses use NASA POWER's monthly MERRA-2 reanalysis. These are model-based grid estimates, not direct measurements at your exact location.",
    footer: "Curiosity is a great place to start.",
    toolsLink: "Open tool",
    learnMore: "Learn about the data source",
    methodologyLink: "How the data and methods work",
    aboutLink: "About Earth Pulse",
  },
  hi: {
    eyebrow: "हमारा ग्रह। आपकी जगह।",
    headline: "पृथ्वी बदल रही है। आइए देखें, आपके रहने की जगह पर क्या बदलाव हो रहा है।",
    subtext: "NASA के असली डेटा को आसान भाषा में समझें। विज्ञान की डिग्री ज़रूरी नहीं।",
    surroundingsTitle: "अपने आसपास की जाँच करें",
    surroundingsDescription:
      "अपनी जगह चुनें और देखें कि पिछले 20 सालों में तापमान और बारिश कैसे बदले हैं।",
    futureTitle: "भविष्य की कल्पना करें",
    futureDescription:
      "भविष्य के जलवायु परिदृश्य के बारे में हाँ या ना वाला सवाल पूछें और NASA मॉडल प्रक्षेपणों से तुलना करें।",
    howTitle: "यह कैसे काम करता है",
    step1Title: "एक जगह चुनें",
    step1: "पृथ्वी पर ऐसी जगह चुनें जो आपके लिए मायने रखती हो।",
    step2Title: "हम NASA का असली डेटा लाते हैं",
    step2: "हम मॉडल-आधारित ऐतिहासिक जलवायु डेटा और भविष्य के जलवायु-मॉडल प्रक्षेपणों का उपयोग करते हैं।",
    step3Title: "आप बदलाव की कहानी देखते हैं",
    step3: "आसान चित्र और सरल शब्द बदलाव को समझने में मदद करते हैं।",
    toolsTitle: "और टूल देखें",
    researchTitle: "रिसर्च असिस्टेंट",
    researchDescription: "पृथ्वी के डेटा और विज्ञान के शब्द समझने में मदद पाएँ।",
    variablesTitle: "कई चीज़ों की जाँच",
    variablesDescription: "जानें कि पृथ्वी की जलवायु के अलग-अलग हिस्से कैसे जुड़े हैं।",
    reportTitle: "रिसर्च रिपोर्ट बनाएँ",
    reportDescription: "अपनी जाँच को साफ़ और साझा करने योग्य रिपोर्ट में बदलें।",
    dataTitle: "हमारा डेटा: क्या जुड़ा है और क्या केवल संदर्भ है",
    activeDataTitle: "Earth Pulse की सुविधाओं से जुड़े स्रोत",
    referenceDataTitle: "केवल संदर्भ — मौजूदा गणनाओं में उपयोग नहीं",
    power: "NASA POWER — Earth Pulse में इस्तेमाल होने वाले ऐतिहासिक मासिक तापमान और सुधारी गई वर्षा का सक्रिय स्रोत। ये रिकॉर्ड MERRA-2 के मॉडल-आधारित री-एनालिसिस पर आधारित हैं, चुनी हुई जगह पर सीधे किए गए माप नहीं।",
    projection: "NASA POWER Projection API — परिदृश्य-आधारित भविष्य के जलवायु-मॉडल प्रक्षेपणों का सक्रिय स्रोत; यह माप या मौसम का पूर्वानुमान नहीं है।",
    cmr: "NASA CMR — केवल डेटासेट मेटाडेटा खोजने की सुविधा; Earth Pulse सूचीबद्ध डेटासेट डाउनलोड या विश्लेषित नहीं करता।",
    earthdata: "NASA Earthdata / GES DISC — डेटा संग्रह और खोज का संदर्भ स्रोत; मौजूदा गणनाएँ यहाँ से डेटा नहीं लेतीं।",
    gpm: "GPM IMERG — NASA के वर्षा अनुमान, केवल संदर्भ के लिए; ये मौजूदा विश्लेषणों में जुड़े नहीं हैं।",
    note:
      "ऐतिहासिक तापमान और वर्षा का विश्लेषण NASA POWER के मासिक MERRA-2 री-एनालिसिस पर आधारित है। ये मॉडल-आधारित ग्रिड अनुमान हैं, आपकी चुनी हुई जगह पर सीधे किए गए माप नहीं।",
    footer: "जिज्ञासा से ही अच्छी शुरुआत होती है।",
    toolsLink: "टूल खोलें",
    learnMore: "डेटा स्रोत के बारे में जानें",
    methodologyLink: "डेटा और तरीकों के बारे में जानें",
    aboutLink: "Earth Pulse के बारे में",
  },
} satisfies Record<Language, Record<string, string>>;

function Icon({
  name,
}: {
  name: "pin" | "sunrise" | "place" | "satellite" | "story" | "assistant" | "layers" | "report";
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    pin: <><path d="M20 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="20" cy="9" r="2.4" /></>,
    sunrise: <><circle cx="20" cy="19" r="5" /><path d="M20 4v4M7.5 7.5l2.8 2.8m19.4-2.8-2.8 2.8M4 19h4m24 0h4M10 28h20" /><path d="M14 19a6 6 0 0 1 12 0" /></>,
    place: <><path d="M20 31s11-10 11-19a11 11 0 1 0-22 0c0 9 11 19 11 19Z" /><circle cx="20" cy="12" r="3.5" /></>,
    satellite: <><path d="m15 17 10 10M13 25l-5 5m15-22 5-5M8 8l5-5m-8 9 9 9m-2-12 9 9m-6-12 9 9" /><path d="m17 13 6-6 4 4-6 6m-8 2-6 6-4-4 6-6" /></>,
    story: <><path d="M7 30V19m9 11V10m9 20V15m7 15H4" /><path d="m6 14 8-6 8 4 9-7" /></>,
    assistant: <><path d="M10 14a10 10 0 0 1 20 0c0 4-2 6-5 8v5H15v-5c-3-2-5-4-5-8Z" /><path d="M17 31h6m-3-25v5m-8 2 4 2m12-2-4 2" /></>,
    layers: <><path d="m20 5 15 8-15 8-15-8 15-8Z" /><path d="m5 20 15 8 15-8M5 27l15 8 15-8" /></>,
    report: <><path d="M12 5h14l6 6v22H12z" /><path d="M26 5v7h6M17 19h10m-10 6h10m-10 6h6" /><path d="M6 11H4v24h20v-2" /></>,
  };
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export default function HomePage() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];

  return (
    <div className={`home home--${language}`} lang={language}>
      <Navbar language={language} onLanguageChange={setLanguage} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__stars" aria-hidden="true" />
          <div className="hero__content">
            <p className="eyebrow"><span className="eyebrow__dot" />{text.eyebrow}</p>
            <h1 id="hero-title">{text.headline}</h1>
            <p className="hero__subtitle">{text.subtext}</p>
            <div className="choice-grid">
              <a className="choice-card choice-card--earth" href="/investigate">
                <span className="choice-card__icon"><Icon name="pin" /></span>
                <span className="choice-card__content">
                  <strong>{text.surroundingsTitle}</strong>
                  <span>{text.surroundingsDescription}</span>
                </span>
                <span className="choice-card__arrow" aria-hidden="true">↗</span>
              </a>
              <a className="choice-card choice-card--future" href="/future">
                <span className="choice-card__icon"><Icon name="sunrise" /></span>
                <span className="choice-card__content">
                  <strong>{text.futureTitle}</strong>
                  <span>{text.futureDescription}</span>
                </span>
                <span className="choice-card__arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="earth-scene" role="img" aria-label={language === "en" ? "Illustration of the rotating Earth in space" : "अंतरिक्ष में घूमती पृथ्वी का चित्र"}>
            <div className="earth-scene__orbit earth-scene__orbit--one" />
            <div className="earth-scene__orbit earth-scene__orbit--two" />
            <div className="earth">
              <div className="earth__land" />
              <div className="earth__shine" />
            </div>
            <span className="earth-scene__spark earth-scene__spark--one" />
            <span className="earth-scene__spark earth-scene__spark--two" />
          </div>
          <a className="scroll-cue" href="#how-it-works">
            <span aria-hidden="true">↓</span>
            <span className="sr-only">{language === "en" ? "Scroll to learn how it works" : "यह कैसे काम करता है जानने के लिए नीचे जाएँ"}</span>
          </a>
        </section>

        <section className="section how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading">
            <p className="eyebrow">{language === "en" ? "THREE SIMPLE STEPS" : "तीन आसान कदम"}</p>
            <h2 id="how-title">{text.howTitle}</h2>
          </div>
          <div className="steps-grid">
            {[
              { icon: "place" as const, title: text.step1Title, description: text.step1, number: "01" },
              { icon: "satellite" as const, title: text.step2Title, description: text.step2, number: "02" },
              { icon: "story" as const, title: text.step3Title, description: text.step3, number: "03" },
            ].map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-card__number">{step.number}</span>
                <span className="step-card__icon"><Icon name={step.icon} /></span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section tools-section" aria-labelledby="tools-title">
          <div className="section-heading section-heading--row">
            <div>
              <p className="eyebrow">{language === "en" ? "GO A LITTLE DEEPER" : "थोड़ा और जानें"}</p>
              <h2 id="tools-title">{text.toolsTitle}</h2>
            </div>
            <span className="section-heading__decoration" aria-hidden="true">✳</span>
          </div>
          <div className="tools-grid">
            <a className="tool-card" href="/lab">
              <span className="tool-card__icon"><Icon name="assistant" /></span>
              <h3>{text.researchTitle}</h3>
              <p>{text.researchDescription}</p>
              <span className="tool-card__link">{text.toolsLink} <span aria-hidden="true">↗</span></span>
            </a>
            <a className="tool-card" href="/lab">
              <span className="tool-card__icon"><Icon name="layers" /></span>
              <h3>{text.variablesTitle}</h3>
              <p>{text.variablesDescription}</p>
              <span className="tool-card__link">{text.toolsLink} <span aria-hidden="true">↗</span></span>
            </a>
            <a className="tool-card" href="/report">
              <span className="tool-card__icon"><Icon name="report" /></span>
              <h3>{text.reportTitle}</h3>
              <p>{text.reportDescription}</p>
              <span className="tool-card__link">{text.toolsLink} <span aria-hidden="true">↗</span></span>
            </a>
          </div>
        </section>

        <section className="data-section" aria-labelledby="data-title">
          <div className="data-section__intro">
            <p className="eyebrow">{language === "en" ? "OPEN SCIENCE" : "खुला विज्ञान"}</p>
            <h2 id="data-title">{text.dataTitle}</h2>
            <p>{text.note}</p>
          </div>
          <h3>{text.activeDataTitle}</h3>
          <ul className="data-list">
            <li><a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer"><span>{text.power}</span><span aria-hidden="true">↗</span></a></li>
            <li><a href="https://power.larc.nasa.gov/docs/services/api/projection/" target="_blank" rel="noreferrer"><span>{text.projection}</span><span aria-hidden="true">↗</span></a></li>
            <li><a href="https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html" target="_blank" rel="noreferrer"><span>{text.cmr}</span><span aria-hidden="true">↗</span></a></li>
          </ul>
          <h3>{text.referenceDataTitle}</h3>
          <ul className="data-list">
            <li><a href="https://disc.gsfc.nasa.gov/" target="_blank" rel="noreferrer"><span>{text.earthdata}</span><span aria-hidden="true">↗</span></a></li>
            <li><a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer"><span>{text.gpm}</span><span aria-hidden="true">↗</span></a></li>
          </ul>
          <a className="methodology-link" href="/methodology">
            {text.methodologyLink} <span aria-hidden="true">↗</span>
          </a>
          <a className="methodology-link" href="/about">
            {text.aboutLink} <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <Footer>{text.footer}</Footer>
    </div>
  );
}
