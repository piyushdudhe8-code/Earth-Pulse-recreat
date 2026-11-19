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

const REQUEST_TIMEOUT_MS = 90_000;

function getApiBaseUrl(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredApiUrl) {
    throw new Error(
      "The Earth Pulse API is not configured. Set NEXT_PUBLIC_API_URL to the backend origin before starting or building the frontend.",
    );
  }

  let url: URL;
  try {
    url = new URL(configuredApiUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an absolute HTTP or HTTPS backend origin.",
    );
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must contain only the backend origin, without credentials, a path, query, or fragment.",
    );
  }

  return url.origin;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function httpErrorMessage(status: number, body: unknown): string {
  const detail = isRecord(body) ? body.detail : undefined;
  const detailMessage =
    typeof detail === "string"
      ? detail
      : isRecord(detail) && typeof detail.message === "string"
        ? detail.message
        : undefined;
  const dataSource =
    isRecord(detail) && typeof detail.data_source === "string"
      ? detail.data_source
      : undefined;

  if (status === 404) {
    return detailMessage
      ? `The Earth Pulse API route was not found (HTTP 404): ${detailMessage}`
      : "The Earth Pulse API route was not found (HTTP 404). Check that the frontend and backend versions match.";
  }
  if (status === 422) {
    return detailMessage
      ? `The request could not be processed (HTTP 422): ${detailMessage}`
      : "The request was not valid for this API endpoint (HTTP 422). Check the submitted values.";
  }
  if (status === 502 && dataSource) {
    return `${dataSource} returned an upstream error (HTTP 502). The Earth Pulse backend is reachable, but the upstream request failed.${detailMessage ? ` ${detailMessage}` : ""}`;
  }
  if (status === 500) {
    return detailMessage
      ? `The Earth Pulse backend encountered an internal error (HTTP 500): ${detailMessage}`
      : "The Earth Pulse backend encountered an internal error (HTTP 500). Check the backend logs.";
  }

  return detailMessage
    ? `The Earth Pulse API returned HTTP ${status}: ${detailMessage}`
    : `The Earth Pulse API returned HTTP ${status}.`;
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
  const apiBaseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(`${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      cache: "no-store",
      headers,
      signal: init?.signal ?? controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `The Earth Pulse API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the Earth Pulse API at ${apiBaseUrl}. The backend may be stopped, or the browser may have blocked the request because of CORS or a network policy. Confirm the backend is reachable at this address and allows this frontend origin.`,
      );
    }
    const reason = error instanceof Error ? error.message : "request failed";
    throw new Error(`The Earth Pulse API request could not be completed: ${reason}`);
  } finally {
    clearTimeout(timeoutId);
  }

  let body: unknown;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        throw new Error(httpErrorMessage(response.status, undefined));
      }
      throw new Error("The Earth Pulse API returned invalid JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(httpErrorMessage(response.status, body));
  }
  if (body === undefined) {
    throw new Error("The Earth Pulse API returned an empty response instead of JSON.");
  }

  return body as T;
}

export async function checkBackendConnection(): Promise<void> {
  const health = await requestJson<{ status: string }>("/health");
  if (health.status !== "ok") {
    throw new Error("The Earth Pulse backend returned an unhealthy status.");
  }
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
