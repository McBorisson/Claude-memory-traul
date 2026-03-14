export interface SignalDefinition {
  id: number;
  name: string;
  description: string | null;
  query: string;
  severity_expression: string;
  enabled: number;
}

export interface SignalMatch {
  message_id: number | null;
  severity: string;
  title: string;
  detail: string;
}

export interface BuiltinSignal {
  name: string;
  description: string;
  query: string;
  severity_expression: string;
}
