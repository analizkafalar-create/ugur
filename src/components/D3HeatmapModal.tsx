/**
 * TerraScan AI - D3 Anomaly Density Heatmap Analysis Modal
 * Modal container with comprehensive geophysical controls and D3 visualization
 */

import React from 'react';
import { ScanArea, AnomalyHotspot, DepthFilter } from '../types';
import { D3AnomalyHeatmapOverlay } from './D3AnomalyHeatmapOverlay';
import { sound } from '../utils/anomalyEngine';

interface D3HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanArea: ScanArea | null;
  selectedHotspot: AnomalyHotspot | null;
  onSelectHotspot?: (hotspot: AnomalyHotspot) => void;
  depthFilter?: DepthFilter;
}

export const D3HeatmapModal: React.FC<D3HeatmapModalProps> = ({
  isOpen,
  onClose,
  scanArea,
  selectedHotspot,
  onSelectHotspot,
  depthFilter,
}) => {
  if (!isOpen || !scanArea) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <D3AnomalyHeatmapOverlay
          scanArea={scanArea}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={onSelectHotspot}
          depthFilter={depthFilter}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
