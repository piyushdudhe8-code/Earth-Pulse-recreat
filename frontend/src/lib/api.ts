export type ClimateVariable = "temperature" | "rainfall";
export type ResearchAssistantResponse = {
  assistant_mode: "llm" | "guided";
  suggested_variables: {
    id: ClimateVariable;
    title: string;
    description: string;
    available_in_analysis: boolean;
  }[];
  suggested_datasets: CMRCollection[];
  research_directions: {
    id:
      | "compare_variables"
      | "check_seasonal_patterns"
      | "compare_nearby_places"
      | "check_data_gaps";
    description: string;
  }[];
  metadata_only_notice: string;
};
export type TrendDirection = "increasing" | "decreasing" | "no clear trend";
export type ProbabilityCondition = "above" | "below";
export type ProbabilityWindow = "next_summer" | "year";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CMRCollection = {
  title: string | null;
  short_name: string | null;
  version: string | null;
  provider: string | null;
  abstract: string;
  temporal_start: string | null;
  temporal_end: string | null;
  spatial_coverage: string[];
  concept_id: string;
  official_links: { title: string | null; rel: string | null; href: string; type: string | null }[];
  metadata_only_notice: string;
  access_note: string;
};

export type CMRSearchResponse = {
  search_url: string;
  result_count: number;
  collections: CMRCollection[];
  metadata_only_notice: string;
};

export type CMRSearchRequest = {
  variable?: string;
  topic?: string;
  name?: string;
  start_time?: string;
  end_time?: string;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  page_size?: number;
};

export type ProjectionRequest = {
  lat: number;
  lon: number;
  variable: ClimateVariable;
  condition: ProbabilityCondition;
  threshold: number;
  scenario: "ssp126" | "ssp245" | "ssp370";
  target_year: number;
};

export type ProjectionModelResult = {
  model: string;
  value: number | null;
  units: string;
  meets_condition: boolean | null;
  annual_values: { year: number; value: number | null }[];
  source_url: string;
  retrieved_at_utc: string;
  cache_status: "live" | "cached";
  grid_cell_latitude: number;
  grid_cell_longitude: number;
  dataset_name: string;
  dataset_version: string;
};

export type ProjectionResponse = {
  latitude: number;
  longitude: number;
  grid_cell_latitude: number;
  grid_cell_longitude: number;
  variable: ClimateVariable;
  parameter_name: string;
  units: string;
  scenario: "ssp126" | "ssp245" | "ssp370";
  target_year: number;
  condition: ProbabilityCondition;
  threshold: number;
  discovered_models: string[];
  models_with_target_data: number;
  models_meeting_condition: number | null;
  ensemble: ProjectionModelResult | null;
  model_results: ProjectionModelResult[];
  interpretation: string;
  dataset_name: string;
  dataset_version: string;
  source: string;
  data_type: string;
  temporal_coverage: string;
  retrieved_at_utc: string;
  cache_status: "live" | "cached" | "mixed";
  source_urls: string[];
  limitations: string[];
};

export type PlaceLocation = Coordinates & {
  label: string;
};

export type GeocodingResult = Coordinates & {
  display_name: string;
};

export type SeriesPoint = {
  period: string;
  value: number | null;
  trend_value: number | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
};

export type AnalyzeResponse = {
  latitude: number;
  longitude: number;
  variable: ClimateVariable;
  monthly_time_series: {
    frequency: "monthly";
    units: string;
    records: SeriesPoint[];
  };
  annual_time_series: {
    frequency: "annual";
    units: string;
    records: SeriesPoint[];
  };
  data_availability: {
    expected_months: number;
    missing_months: number;
    complete_years: number;
    incomplete_years: number[];
  };
  trend: {
    direction: TrendDirection;
    rate_of_change: number;
    rate_units: string;
    significant: boolean;
    test_names: string[];
    mann_kendall_test: string;
    mann_kendall_p_value: number;
    sen_slope_per_year: number;
    linear_regression: {
      slope_per_year: number;
      intercept: number;
      p_value: number;
      confidence_interval_95: [number, number];
      r_squared: number;
    };
  };
  dataset: {
    name: string;
    version: string;
    source: string;
    data_type: string;
    parameter_name: string;
    source_units: string;
    monthly_units: string;
    annual_units: string;
    requested_start_year: number;
    requested_end_year: number;
    first_observation: string | null;
    last_observation: string | null;
    aggregation: string;
    source_url: string;
    retrieved_at_utc: string;
    cache_status: "live" | "cached";
    grid_cell_latitude: number;
    grid_cell_longitude: number;
  };
  limitations: string[];
  plain_language: string;
};

export type ResearchReportSnapshot = {
  question: string;
  location: PlaceLocation;
  start_year: number;
  end_year: number;
  analyses: {
    place: PlaceLocation;
    result: AnalyzeResponse;
  }[];
};

export type ProbabilityResponse = {
  latitude: number;
  longitude: number;
  variable: ClimateVariable;
  condition: ProbabilityCondition;
  threshold: number;
  units: string;
  time_window: string;
  target_year: number;
  target_months: string[];
  probability_percent: number;
  confidence_range_percent: [number, number];
  historical_events: number;
  historical_periods: number;
  historical_probability_percent: number;
  method: string;
  data_used: {
    dataset_name: string;
    dataset_version: string;
    source: string;
    data_type: string;
    parameter_name: string;
    source_units: string;
    analysis_units: string;
    requested_start_year: number;
    requested_end_year: number;
    complete_periods: number;
    missing_periods: number;
    source_url: string;
    retrieved_at_utc: string;
    cache_status: "live" | "cached";
    grid_cell_latitude: number;
    grid_cell_longitude: number;
    historical_values: { year: number; value: number }[];
    trend_direction: TrendDirection;
    trend_significant: boolean;
    trend_rate_per_decade: number;
  };
  assumptions: string[];
  limitations: string[];
  plain_language: string;
};

export type AnalyzeRequest = {
  lat: number;
  lon: number;
  variable: ClimateVariable;
  start_year?: number;
  end_year?: number;
  frequency: "monthly";
};

export type EstimateProbabilityRequest = {
  lat: number;
  lon: number;
  variable: ClimateVariable;
  condition: ProbabilityCondition;
  threshold: number;
  time_window: ProbabilityWindow;
  target_year?: number;
  start_year?: number;
  end_year?: number;
};

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, "")
  : process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getProjectionModelCatalog(): Promise<{
  temporal: string;
  models: string[];
  catalog_url: string;
  retrieved_at_utc: string;
}> {
  return requestJson("/api/projection/models");
}

export function analyzeProjection(request: ProjectionRequest): Promise<ProjectionResponse> {
  return requestJson<ProjectionResponse>("/api/projection/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function searchCMRCollections(
  request: CMRSearchRequest,
): Promise<CMRSearchResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(request)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  return requestJson<CMRSearchResponse>(`/api/cmr/collections?${search.toString()}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "The Earth Pulse API is not configured. Set NEXT_PUBLIC_API_URL for this deployment.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network request failed";
    throw new Error(`Could not connect to the Earth Pulse API: ${reason}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The Earth Pulse API returned an unreadable response.");
  }

  if (!response.ok) {
    let message = `The Earth Pulse API returned HTTP ${response.status}.`;
    if (isRecord(body) && isRecord(body.detail)) {
      if (body.detail.data_source === "NASA POWER") {
        message = "NASA data could not be retrieved. Please try again.";
      } else if (typeof body.detail.message === "string") {
        message = body.detail.message;
      }
    } else if (isRecord(body) && typeof body.detail === "string") {
      message = body.detail;
    }
    throw new Error(message);
  }

  return body as T;
}

export function analyzeLocation(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return requestJson<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function estimateLocationProbability(
  request: EstimateProbabilityRequest,
): Promise<ProbabilityResponse> {
  return requestJson<ProbabilityResponse>("/api/probability", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function searchPlaces(query: string): Promise<GeocodingResult[]> {
  const search = new URLSearchParams({ q: query });
  return requestJson<GeocodingResult[]>(`/api/geocode?${search.toString()}`, {
    method: "GET",
  });
}

export function getResearchSuggestions(
  question: string,
): Promise<ResearchAssistantResponse> {
  return requestJson<ResearchAssistantResponse>("/api/research-assistant", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
