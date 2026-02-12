declare module 'react-gauge-component' {
  import type { ComponentType } from 'react';

  interface GaugeComponentProps {
    type?: 'semicircle' | 'radial' | 'grafana';
    minValue?: number;
    maxValue?: number;
    value?: number;
    marginInPercent?: { top?: number; bottom?: number; left?: number; right?: number };
    arc?: {
      width?: number;
      cornerRadius?: number;
      padding?: number;
      subArcs?: Array<{
        limit?: number;
        color?: string;
        showTick?: boolean;
      }>;
    };
    pointer?: {
      type?: 'needle' | 'blob' | 'arrow';
      color?: string;
      baseColor?: string;
      length?: number;
      width?: number;
      strokeWidth?: number;
      strokeColor?: string;
      animate?: boolean;
      elastic?: boolean;
      animationDuration?: number;
      animationDelay?: number;
    };
    labels?: {
      valueLabel?: {
        hide?: boolean;
        formatTextValue?: (value: number) => string;
        style?: React.CSSProperties;
        matchColorWithArc?: boolean;
      };
      tickLabels?: {
        type?: 'inner' | 'outer';
        hideMinMax?: boolean;
        ticks?: Array<{ value: number }>;
        defaultTickValueConfig?: {
          formatTextValue?: (value: number) => string;
          style?: Record<string, unknown>;
        };
        defaultTickLineConfig?: {
          color?: string;
          width?: number;
          length?: number;
          distanceFromArc?: number;
        };
      };
    };
    className?: string;
    style?: React.CSSProperties;
  }

  const GaugeComponent: ComponentType<GaugeComponentProps>;
  export default GaugeComponent;
}
