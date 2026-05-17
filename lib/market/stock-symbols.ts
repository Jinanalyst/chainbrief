export type StockFilter =
  | "all"
  | "sp500"
  | "nasdaq100"
  | "dow"
  | "tech"
  | "ai"
  | "semiconductors"
  | "finance"
  | "energy";

export type StockSector =
  | "Technology"
  | "Communication"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Healthcare"
  | "Financials"
  | "Industrials"
  | "Energy"
  | "Materials"
  | "Real Estate"
  | "Utilities";

export type StockMeta = {
  symbol: string;
  name: string;
  sector: StockSector;
};

// ── Sector-tagged master list ────────────────────────────────────────────────

const TECHNOLOGY: StockMeta[] = [
  { symbol: "AAPL",  name: "Apple",        sector: "Technology" },
  { symbol: "MSFT",  name: "Microsoft",    sector: "Technology" },
  { symbol: "NVDA",  name: "NVIDIA",       sector: "Technology" },
  { symbol: "AVGO",  name: "Broadcom",     sector: "Technology" },
  { symbol: "ORCL",  name: "Oracle",       sector: "Technology" },
  { symbol: "CRM",   name: "Salesforce",   sector: "Technology" },
  { symbol: "ADBE",  name: "Adobe",        sector: "Technology" },
  { symbol: "AMD",   name: "AMD",          sector: "Technology" },
  { symbol: "QCOM",  name: "Qualcomm",     sector: "Technology" },
  { symbol: "TXN",   name: "Texas Inst.",  sector: "Technology" },
  { symbol: "IBM",   name: "IBM",          sector: "Technology" },
  { symbol: "CSCO",  name: "Cisco",        sector: "Technology" },
  { symbol: "NOW",   name: "ServiceNow",   sector: "Technology" },
  { symbol: "INTU",  name: "Intuit",       sector: "Technology" },
  { symbol: "ACN",   name: "Accenture",    sector: "Technology" },
  { symbol: "AMAT",  name: "App Materials",sector: "Technology" },
  { symbol: "LRCX",  name: "Lam Research", sector: "Technology" },
  { symbol: "KLAC",  name: "KLA Corp",     sector: "Technology" },
  { symbol: "ADI",   name: "Analog Dev.",  sector: "Technology" },
  { symbol: "CDNS",  name: "Cadence",      sector: "Technology" },
  { symbol: "SNPS",  name: "Synopsys",     sector: "Technology" },
  { symbol: "PANW",  name: "Palo Alto",    sector: "Technology" },
  { symbol: "CRWD",  name: "CrowdStrike",  sector: "Technology" },
  { symbol: "FTNT",  name: "Fortinet",     sector: "Technology" },
  { symbol: "PLTR",  name: "Palantir",     sector: "Technology" },
  { symbol: "WDAY",  name: "Workday",      sector: "Technology" },
  { symbol: "SNOW",  name: "Snowflake",    sector: "Technology" },
  { symbol: "DDOG",  name: "Datadog",      sector: "Technology" },
  { symbol: "MDB",   name: "MongoDB",      sector: "Technology" },
  { symbol: "HPQ",   name: "HP Inc.",      sector: "Technology" },
  { symbol: "DELL",  name: "Dell",         sector: "Technology" },
  { symbol: "ANET",  name: "Arista Ntwks", sector: "Technology" },
  { symbol: "PSTG",  name: "Pure Storage", sector: "Technology" },
  { symbol: "NTAP",  name: "NetApp",       sector: "Technology" },
  { symbol: "CTSH",  name: "Cognizant",    sector: "Technology" },
];

const COMMUNICATION: StockMeta[] = [
  { symbol: "GOOGL", name: "Alphabet",     sector: "Communication" },
  { symbol: "META",  name: "Meta",         sector: "Communication" },
  { symbol: "NFLX",  name: "Netflix",      sector: "Communication" },
  { symbol: "DIS",   name: "Disney",       sector: "Communication" },
  { symbol: "CMCSA", name: "Comcast",      sector: "Communication" },
  { symbol: "T",     name: "AT&T",         sector: "Communication" },
  { symbol: "VZ",    name: "Verizon",      sector: "Communication" },
  { symbol: "TMUS",  name: "T-Mobile",     sector: "Communication" },
  { symbol: "CHTR",  name: "Charter",      sector: "Communication" },
  { symbol: "TTWO",  name: "Take-Two",     sector: "Communication" },
];

const CONSUMER_DISCRETIONARY: StockMeta[] = [
  { symbol: "AMZN",  name: "Amazon",       sector: "Consumer Discretionary" },
  { symbol: "TSLA",  name: "Tesla",        sector: "Consumer Discretionary" },
  { symbol: "HD",    name: "Home Depot",   sector: "Consumer Discretionary" },
  { symbol: "MCD",   name: "McDonald's",   sector: "Consumer Discretionary" },
  { symbol: "NKE",   name: "Nike",         sector: "Consumer Discretionary" },
  { symbol: "BKNG",  name: "Booking",      sector: "Consumer Discretionary" },
  { symbol: "TGT",   name: "Target",       sector: "Consumer Discretionary" },
  { symbol: "LOW",   name: "Lowe's",       sector: "Consumer Discretionary" },
  { symbol: "SBUX",  name: "Starbucks",    sector: "Consumer Discretionary" },
  { symbol: "CMG",   name: "Chipotle",     sector: "Consumer Discretionary" },
  { symbol: "ORLY",  name: "O'Reilly",     sector: "Consumer Discretionary" },
  { symbol: "GM",    name: "Gen. Motors",  sector: "Consumer Discretionary" },
  { symbol: "F",     name: "Ford",         sector: "Consumer Discretionary" },
  { symbol: "MAR",   name: "Marriott",     sector: "Consumer Discretionary" },
  { symbol: "ABNB",  name: "Airbnb",       sector: "Consumer Discretionary" },
  { symbol: "UBER",  name: "Uber",         sector: "Consumer Discretionary" },
];

const CONSUMER_STAPLES: StockMeta[] = [
  { symbol: "WMT",   name: "Walmart",      sector: "Consumer Staples" },
  { symbol: "COST",  name: "Costco",       sector: "Consumer Staples" },
  { symbol: "PG",    name: "Procter & G.", sector: "Consumer Staples" },
  { symbol: "KO",    name: "Coca-Cola",    sector: "Consumer Staples" },
  { symbol: "PEP",   name: "PepsiCo",      sector: "Consumer Staples" },
  { symbol: "PM",    name: "Philip Morris",sector: "Consumer Staples" },
  { symbol: "MO",    name: "Altria",       sector: "Consumer Staples" },
  { symbol: "MDLZ",  name: "Mondelez",     sector: "Consumer Staples" },
  { symbol: "KMB",   name: "Kimberly-C.",  sector: "Consumer Staples" },
  { symbol: "CL",    name: "Colgate",      sector: "Consumer Staples" },
];

const HEALTHCARE: StockMeta[] = [
  { symbol: "LLY",   name: "Eli Lilly",    sector: "Healthcare" },
  { symbol: "UNH",   name: "UnitedHealth", sector: "Healthcare" },
  { symbol: "JNJ",   name: "Johnson & J.", sector: "Healthcare" },
  { symbol: "MRK",   name: "Merck",        sector: "Healthcare" },
  { symbol: "ABBV",  name: "AbbVie",       sector: "Healthcare" },
  { symbol: "PFE",   name: "Pfizer",       sector: "Healthcare" },
  { symbol: "TMO",   name: "Thermo Fisher",sector: "Healthcare" },
  { symbol: "ABT",   name: "Abbott",       sector: "Healthcare" },
  { symbol: "BMY",   name: "Bristol-Myers",sector: "Healthcare" },
  { symbol: "AMGN",  name: "Amgen",        sector: "Healthcare" },
  { symbol: "ISRG",  name: "Intuitive S.", sector: "Healthcare" },
  { symbol: "GILD",  name: "Gilead",       sector: "Healthcare" },
  { symbol: "REGN",  name: "Regeneron",    sector: "Healthcare" },
  { symbol: "VRTX",  name: "Vertex",       sector: "Healthcare" },
  { symbol: "BSX",   name: "Boston Sci.",  sector: "Healthcare" },
  { symbol: "ZTS",   name: "Zoetis",       sector: "Healthcare" },
  { symbol: "CI",    name: "Cigna",        sector: "Healthcare" },
  { symbol: "ELV",   name: "Elevance",     sector: "Healthcare" },
  { symbol: "DHR",   name: "Danaher",      sector: "Healthcare" },
  { symbol: "SYK",   name: "Stryker",      sector: "Healthcare" },
];

const FINANCIALS: StockMeta[] = [
  { symbol: "JPM",   name: "JPMorgan",     sector: "Financials" },
  { symbol: "BAC",   name: "Bank of Am.",  sector: "Financials" },
  { symbol: "WFC",   name: "Wells Fargo",  sector: "Financials" },
  { symbol: "GS",    name: "Goldman S.",   sector: "Financials" },
  { symbol: "MS",    name: "Morgan S.",    sector: "Financials" },
  { symbol: "C",     name: "Citigroup",    sector: "Financials" },
  { symbol: "BLK",   name: "BlackRock",    sector: "Financials" },
  { symbol: "SCHW",  name: "Schwab",       sector: "Financials" },
  { symbol: "AXP",   name: "Amex",         sector: "Financials" },
  { symbol: "V",     name: "Visa",         sector: "Financials" },
  { symbol: "MA",    name: "Mastercard",   sector: "Financials" },
  { symbol: "SPGI",  name: "S&P Global",   sector: "Financials" },
  { symbol: "ICE",   name: "ICE",          sector: "Financials" },
  { symbol: "CME",   name: "CME Group",    sector: "Financials" },
  { symbol: "COF",   name: "Capital One",  sector: "Financials" },
  { symbol: "USB",   name: "US Bancorp",   sector: "Financials" },
  { symbol: "PNC",   name: "PNC Fin.",     sector: "Financials" },
  { symbol: "TFC",   name: "Truist",       sector: "Financials" },
  { symbol: "DFS",   name: "Discover",     sector: "Financials" },
  { symbol: "BK",    name: "BNY Mellon",   sector: "Financials" },
  { symbol: "MCO",   name: "Moody's",      sector: "Financials" },
  { symbol: "AON",   name: "Aon",          sector: "Financials" },
  { symbol: "MMC",   name: "Marsh & Mcl.", sector: "Financials" },
  { symbol: "CB",    name: "Chubb",        sector: "Financials" },
  { symbol: "PRU",   name: "Prudential",   sector: "Financials" },
  { symbol: "MET",   name: "MetLife",      sector: "Financials" },
  { symbol: "AFL",   name: "Aflac",        sector: "Financials" },
  { symbol: "PYPL",  name: "PayPal",       sector: "Financials" },
  { symbol: "FI",    name: "Fiserv",       sector: "Financials" },
  { symbol: "FIS",   name: "FIS",          sector: "Financials" },
  { symbol: "GPN",   name: "Global Pay.",  sector: "Financials" },
  { symbol: "MKTX",  name: "MarketAxess",  sector: "Financials" },
];

const INDUSTRIALS: StockMeta[] = [
  { symbol: "CAT",   name: "Caterpillar",  sector: "Industrials" },
  { symbol: "BA",    name: "Boeing",       sector: "Industrials" },
  { symbol: "HON",   name: "Honeywell",    sector: "Industrials" },
  { symbol: "UPS",   name: "UPS",          sector: "Industrials" },
  { symbol: "RTX",   name: "RTX Corp",     sector: "Industrials" },
  { symbol: "LMT",   name: "Lockheed M.",  sector: "Industrials" },
  { symbol: "GE",    name: "GE Aerospace", sector: "Industrials" },
  { symbol: "MMM",   name: "3M",           sector: "Industrials" },
  { symbol: "DE",    name: "Deere & Co.",  sector: "Industrials" },
  { symbol: "EMR",   name: "Emerson",      sector: "Industrials" },
  { symbol: "ETN",   name: "Eaton",        sector: "Industrials" },
  { symbol: "ITW",   name: "Ill. Tool W.", sector: "Industrials" },
  { symbol: "NOC",   name: "Northrop G.",  sector: "Industrials" },
  { symbol: "FDX",   name: "FedEx",        sector: "Industrials" },
  { symbol: "UNP",   name: "Union Pacific",sector: "Industrials" },
  { symbol: "NSC",   name: "Norfolk S.",   sector: "Industrials" },
  { symbol: "CTAS",  name: "Cintas",       sector: "Industrials" },
];

const ENERGY: StockMeta[] = [
  { symbol: "XOM",   name: "ExxonMobil",   sector: "Energy" },
  { symbol: "CVX",   name: "Chevron",      sector: "Energy" },
  { symbol: "COP",   name: "ConocoPhil.",  sector: "Energy" },
  { symbol: "EOG",   name: "EOG Res.",     sector: "Energy" },
  { symbol: "SLB",   name: "Schlumberger", sector: "Energy" },
  { symbol: "OXY",   name: "Occidental",   sector: "Energy" },
  { symbol: "MPC",   name: "Marathon P.",  sector: "Energy" },
  { symbol: "PSX",   name: "Phillips 66",  sector: "Energy" },
  { symbol: "VLO",   name: "Valero",       sector: "Energy" },
  { symbol: "HAL",   name: "Halliburton",  sector: "Energy" },
  { symbol: "BKR",   name: "Baker Hughes", sector: "Energy" },
  { symbol: "DVN",   name: "Devon Energy", sector: "Energy" },
  { symbol: "HES",   name: "Hess Corp",    sector: "Energy" },
  { symbol: "FANG",  name: "Diamondback",  sector: "Energy" },
  { symbol: "APA",   name: "APA Corp",     sector: "Energy" },
  { symbol: "LNG",   name: "Cheniere",     sector: "Energy" },
  { symbol: "WMB",   name: "Williams",     sector: "Energy" },
  { symbol: "KMI",   name: "Kinder M.",    sector: "Energy" },
  { symbol: "OKE",   name: "ONEOK",        sector: "Energy" },
  { symbol: "ET",    name: "Energy Trans.",sector: "Energy" },
];

const MATERIALS: StockMeta[] = [
  { symbol: "LIN",   name: "Linde",        sector: "Materials" },
  { symbol: "APD",   name: "Air Products", sector: "Materials" },
  { symbol: "ECL",   name: "Ecolab",       sector: "Materials" },
  { symbol: "NEM",   name: "Newmont",      sector: "Materials" },
  { symbol: "FCX",   name: "Freeport-Mcm.",sector: "Materials" },
  { symbol: "DOW",   name: "Dow Inc.",     sector: "Materials" },
  { symbol: "DD",    name: "DuPont",       sector: "Materials" },
  { symbol: "ALB",   name: "Albemarle",    sector: "Materials" },
  { symbol: "PPG",   name: "PPG Ind.",     sector: "Materials" },
];

const REAL_ESTATE: StockMeta[] = [
  { symbol: "AMT",   name: "Amer. Tower",  sector: "Real Estate" },
  { symbol: "PLD",   name: "Prologis",     sector: "Real Estate" },
  { symbol: "CCI",   name: "Crown Castle", sector: "Real Estate" },
  { symbol: "EQIX",  name: "Equinix",      sector: "Real Estate" },
  { symbol: "PSA",   name: "Pub. Storage", sector: "Real Estate" },
  { symbol: "DLR",   name: "Digital Rlty", sector: "Real Estate" },
  { symbol: "SPG",   name: "Simon Prop.",  sector: "Real Estate" },
  { symbol: "O",     name: "Realty Income",sector: "Real Estate" },
];

const UTILITIES: StockMeta[] = [
  { symbol: "NEE",   name: "NextEra",      sector: "Utilities" },
  { symbol: "DUK",   name: "Duke Energy",  sector: "Utilities" },
  { symbol: "SO",    name: "Southern Co.", sector: "Utilities" },
  { symbol: "D",     name: "Dominion",     sector: "Utilities" },
  { symbol: "AEP",   name: "Am. El. Pwr.", sector: "Utilities" },
  { symbol: "EXC",   name: "Exelon",       sector: "Utilities" },
  { symbol: "XEL",   name: "Xcel Energy",  sector: "Utilities" },
  { symbol: "CEG",   name: "Constellation",sector: "Utilities" },
];

// ── Combined master list (all sectors) ──────────────────────────────────────

export const ALL_STOCKS: StockMeta[] = [
  ...TECHNOLOGY,
  ...COMMUNICATION,
  ...CONSUMER_DISCRETIONARY,
  ...CONSUMER_STAPLES,
  ...HEALTHCARE,
  ...FINANCIALS,
  ...INDUSTRIALS,
  ...ENERGY,
  ...MATERIALS,
  ...REAL_ESTATE,
  ...UTILITIES,
];

// ── Filter-specific symbol subsets ────────────────────────────────────────────

const SP500_SYMBOLS = [
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","JPM","LLY",
  "V","UNH","XOM","MA","JNJ","WMT","PG","HD","COST","MRK","ORCL","BAC",
  "ABBV","CRM","AMD","CVX","KO","PEP","TMO","MCD","NFLX","ACN","ABT",
  "IBM","TXN","QCOM","AMGN","INTU","BKNG","RTX","SPGI","GS","CAT","ISRG",
  "AXP","GILD","VRTX","MS","C","CME","CI","SCHW","HON","MDLZ","BSX","UNP",
  "ETN","DE","GE","AMAT","UBER","REGN","ADI","PLD","MMC","CB","LRCX","KLAC",
  "TJX","AMT","MO","EOG","DUK","SHW","USB","NEE","CMCSA","VZ","T","DIS",
  "CDNS","SNPS","BA","NKE","ITW","NSC","ELV","AON","MCO","FI","AFL","PRU",
  "EMR","ETN","LMT","NOC","FDX","PANW","CRWD","WDAY","PLTR","SNOW","DDOG",
];

const NASDAQ100_SYMBOLS = [
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","COST","NFLX",
  "ADBE","AMD","QCOM","TXN","INTU","ISRG","BKNG","AMGN","REGN","VRTX",
  "LRCX","KLAC","AMAT","ADI","MRVL","CDNS","SNPS","PANW","CRWD","WDAY",
  "FTNT","DDOG","MDB","SNOW","MELI","PYPL","SBUX","MDLZ","GILD","CTAS",
  "CSX","MAR","PCAR","DXCM","MNST","FAST","ROST","PAYX","ODFL","CPRT",
  "MCHP","IDXX","BIIB","EXC","KHC","DLTR","PDD","TTWO","ZS","OKTA",
  "TEAM","MU","ARM","ON","NXPI","TMUS","CHTR","ASML","IBM","ORCL","CRM",
  "NOW","PLTR","ABNB","UBER","CMCSA","INTC","QCOM","HON","JD",
];

const DOW_SYMBOLS = [
  "AAPL","AMGN","AXP","BA","CAT","CRM","CSCO","CVX","DIS","GS",
  "HD","HON","IBM","JNJ","JPM","KO","MCD","MMM","MRK","MSFT",
  "NKE","PG","TRV","UNH","V","VZ","WBA","WMT","DOW","INTC",
];

const AI_SYMBOLS = [
  "NVDA","MSFT","GOOGL","META","AMZN","IBM","CRM","ORCL","NOW","AMD",
  "INTC","AVGO","QCOM","PLTR","ARM","SNOW","DDOG","MDB","WDAY","CDNS",
  "SNPS","PANW","CRWD","ZS","OKTA","TEAM","SOUN","AI","PATH","BBAI",
  "CFLT","GTLB","ESTC","SPLK","ANET","PSTG","NTAP","DDOG",
];

const SEMICONDUCTOR_SYMBOLS = [
  "NVDA","AVGO","AMD","QCOM","TXN","INTC","AMAT","LRCX","KLAC","MU",
  "ADI","MRVL","ARM","MCHP","ON","NXPI","MPWR","SWKS","QRVO","STM",
  "ASML","TSM","ONTO","AMBA","SLAB","ALGM","DIOD","WOLF","ENPH","CREE",
];

// ── Lookup helpers ───────────────────────────────────────────────────────────

const SYMBOL_MAP = new Map<string, StockMeta>(
  ALL_STOCKS.map((s) => [s.symbol, s]),
);

export function getMetaForSymbol(symbol: string): StockMeta {
  return (
    SYMBOL_MAP.get(symbol) ?? { symbol, name: symbol, sector: "Technology" }
  );
}

export function getSymbolsForFilter(filter: StockFilter): string[] {
  switch (filter) {
    case "all":
      return ALL_STOCKS.map((s) => s.symbol);
    case "sp500":
      return SP500_SYMBOLS;
    case "nasdaq100":
      return NASDAQ100_SYMBOLS;
    case "dow":
      return DOW_SYMBOLS;
    case "tech":
      return TECHNOLOGY.map((s) => s.symbol);
    case "ai":
      return AI_SYMBOLS;
    case "semiconductors":
      return SEMICONDUCTOR_SYMBOLS;
    case "finance":
      return FINANCIALS.map((s) => s.symbol);
    case "energy":
      return ENERGY.map((s) => s.symbol);
  }
}

export const SECTOR_ORDER: StockSector[] = [
  "Technology",
  "Communication",
  "Consumer Discretionary",
  "Consumer Staples",
  "Healthcare",
  "Financials",
  "Industrials",
  "Energy",
  "Materials",
  "Real Estate",
  "Utilities",
];

export const FILTER_CONFIG: {
  id: StockFilter;
  label: string;
  grouped: boolean;
}[] = [
  { id: "all",          label: "All",           grouped: true },
  { id: "sp500",        label: "S&P 500",        grouped: true },
  { id: "nasdaq100",    label: "Nasdaq 100",     grouped: true },
  { id: "dow",          label: "Dow Jones",      grouped: true },
  { id: "tech",         label: "Technology",     grouped: false },
  { id: "ai",           label: "AI & Software",  grouped: false },
  { id: "semiconductors", label: "Semiconductors", grouped: false },
  { id: "finance",      label: "Financials",     grouped: false },
  { id: "energy",       label: "Energy",         grouped: false },
];
