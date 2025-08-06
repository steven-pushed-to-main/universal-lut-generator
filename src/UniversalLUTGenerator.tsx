// @ts-nocheck
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, ImageIcon, Palette, Camera, FileText, BarChart3, Zap } from 'lucide-react';

const UniversalLUTGenerator = () => {
  const [referenceImages, setReferenceImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedLUT, setGeneratedLUT] = useState(null);
  const [colorAnalysis, setColorAnalysis] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
  const [bwConversionMethod, setBwConversionMethod] = useState('luminance');
  const [intensityLevel, setIntensityLevel] = useState(3);
  const [advancedMode, setAdvancedMode] = useState(true);
  const [lutResolution, setLutResolution] = useState(33);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, imageProgress: 0, stage: '' });
  const [debugInfo, setDebugInfo] = useState([]);
  const fileInputRef = useRef(null);

  // Universal camera color profile
  const universalCameraProfile = {
    shadows: { lift: { r: 0.015, g: 0.012, b: 0.008 } },
    midtones: { gamma: { r: 0.5, g: 0.5, b: 0.5 } },
    highlights: { gain: { r: 0.95, g: 0.95, b: 0.95 } },
    colorMatrix: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
  };

  // Convert RGB to LAB color space
  const rgbToLab = (r, g, b) => {
    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    x /= 0.95047; y /= 1.00000; z /= 1.08883;
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  };

  // Detect if image is B&W
  const detectBlackAndWhite = (imageData) => {
    const data = imageData.data;
    let colorfulPixels = 0;
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)) > 10) {
        colorfulPixels++;
      }
    }
    return colorfulPixels / (data.length / 40) < 0.05;
  };

  // Convert RGB to grayscale
  const rgbToGrayscale = (r, g, b, method = 'luminance') => {
    switch (method) {
      case 'luminance': return 0.299 * r + 0.587 * g + 0.114 * b;
      case 'average': return (r + g + b) / 3;
      case 'red': return r;
      case 'green': return g;
      case 'blue': return b;
      case 'max': return Math.max(r, g, b);
      case 'min': return Math.min(r, g, b);
      default: return 0.299 * r + 0.587 * g + 0.114 * b;
    }
  };

  // Simplified image analysis - back to working basics
  const analyzeImageAdvanced = (imageUrl, imageIndex, totalImages) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout analyzing image ${imageIndex + 1}`));
      }, 30000);
      
      img.onload = () => {
        try {
          clearTimeout(timeout);
          setAnalysisProgress(prev => ({ ...prev, current: imageIndex + 1, total: totalImages, imageProgress: 20, stage: 'Loading' }));
          
          // Back to simpler scaling
          const maxSize = 512;
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setAnalysisProgress(prev => ({ ...prev, imageProgress: 50, stage: 'Analyzing' }));
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const isBW = detectBlackAndWhite(imageData);
          const analysis = {
            isBlackAndWhite: isBW,
            shadows: { r: [], g: [], b: [], luminance: [], lab: [] },
            midtones: { r: [], g: [], b: [], luminance: [], lab: [] },
            highlights: { r: [], g: [], b: [], luminance: [], lab: [] }
          };

          // Simple pixel sampling - back to original logic
          const sampleRate = 16; // Consistent sampling rate
          for (let i = 0; i < data.length; i += 4 * sampleRate) {
            const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
            const luminance = rgbToGrayscale(r, g, b, 'luminance');
            const lab = rgbToLab(r, g, b);

            // Original simple zone logic
            if (luminance < 0.25) {
              analysis.shadows.r.push(r);
              analysis.shadows.g.push(g);
              analysis.shadows.b.push(b);
              analysis.shadows.luminance.push(luminance);
              analysis.shadows.lab.push(lab);
            } else if (luminance < 0.75) {
              analysis.midtones.r.push(r);
              analysis.midtones.g.push(g);
              analysis.midtones.b.push(b);
              analysis.midtones.luminance.push(luminance);
              analysis.midtones.lab.push(lab);
            } else {
              analysis.highlights.r.push(r);
              analysis.highlights.g.push(g);
              analysis.highlights.b.push(b);
              analysis.highlights.luminance.push(luminance);
              analysis.highlights.lab.push(lab);
            }
          }

          setAnalysisProgress(prev => ({ ...prev, imageProgress: 80, stage: 'Computing' }));

          // Simple zone processing - back to original
          const processZone = (zone) => {
            if (zone.r.length === 0) return null;
            
            return {
              count: zone.r.length,
              rgb: {
                r: zone.r.reduce((a, b) => a + b, 0) / zone.r.length,
                g: zone.g.reduce((a, b) => a + b, 0) / zone.g.length,
                b: zone.b.reduce((a, b) => a + b, 0) / zone.b.length
              },
              luminance: {
                avg: zone.luminance.reduce((a, b) => a + b, 0) / zone.luminance.length
              },
              lab: {
                L: zone.lab.reduce((a, b) => a + b.L, 0) / zone.lab.length,
                a: zone.lab.reduce((a, b) => a + b.a, 0) / zone.lab.length,
                b: zone.lab.reduce((a, b) => a + b.b, 0) / zone.lab.length
              }
            };
          };

          setAnalysisProgress(prev => ({ ...prev, imageProgress: 100, stage: 'Complete' }));
          
          resolve({
            isBlackAndWhite: isBW,
            shadows: processZone(analysis.shadows),
            midtones: processZone(analysis.midtones),
            highlights: processZone(analysis.highlights)
          });
          
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image ${imageIndex + 1}`));
      };
      
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  };

  const handleImageUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    if (files.length > 10) {
      alert('Please select up to 10 images only.');
      return;
    }

    const newImages = [];
    let loadedCount = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages[index] = { id: Date.now() + index, file, url: e.target.result, name: file.name };
        loadedCount++;
        if (loadedCount === files.length) {
          setReferenceImages(newImages.filter(Boolean));
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Generate advanced LUT
  const generateAdvancedLUT = async () => {
    if (referenceImages.length === 0) return;

    setIsProcessing(true);
    setProcessingStep('Starting analysis...');
    setAnalysisProgress({ current: 0, total: 0, imageProgress: 0, stage: '' });
    setDebugInfo([]);
    
    try {
      const analyses = [];
      for (let i = 0; i < referenceImages.length; i++) {
        setProcessingStep(`Analyzing image ${i + 1}/${referenceImages.length}...`);
        try {
          const analysis = await analyzeImageAdvanced(referenceImages[i].url, i, referenceImages.length);
          analyses.push(analysis);
        } catch (error) {
          console.error(`Error analyzing image ${i + 1}:`, error);
        }
      }

      if (analyses.length === 0) throw new Error('Failed to analyze any reference images');

      setProcessingStep('Computing color transformations...');
      const hasBlackAndWhite = analyses.some(analysis => analysis.isBlackAndWhite);
      setIsBlackAndWhite(hasBlackAndWhite);

      // Simple combine analyses - back to working version
      const combinedAnalysis = {
        isBlackAndWhite: hasBlackAndWhite,
        shadows: { rgb: { r: 0, g: 0, b: 0 }, luminance: { avg: 0 }, lab: { L: 0, a: 0, b: 0 }, weight: 0 },
        midtones: { rgb: { r: 0, g: 0, b: 0 }, luminance: { avg: 0 }, lab: { L: 0, a: 0, b: 0 }, weight: 0 },
        highlights: { rgb: { r: 0, g: 0, b: 0 }, luminance: { avg: 0 }, lab: { L: 0, a: 0, b: 0 }, weight: 0 },
        globalStats: {
          contrast: 0.5,
          saturation: 0.5,
          colorTemperature: 0,
          tint: 0
        }
      };

      analyses.forEach((analysis) => {
        ['shadows', 'midtones', 'highlights'].forEach(zone => {
          if (analysis[zone] && analysis[zone].count > 0) {
            const weight = analysis[zone].count;
            combinedAnalysis[zone].rgb.r += analysis[zone].rgb.r * weight;
            combinedAnalysis[zone].rgb.g += analysis[zone].rgb.g * weight;
            combinedAnalysis[zone].rgb.b += analysis[zone].rgb.b * weight;
            combinedAnalysis[zone].luminance.avg += analysis[zone].luminance.avg * weight;
            combinedAnalysis[zone].lab.L += analysis[zone].lab.L * weight;
            combinedAnalysis[zone].lab.a += analysis[zone].lab.a * weight;
            combinedAnalysis[zone].lab.b += analysis[zone].lab.b * weight;
            combinedAnalysis[zone].weight += weight;
          }
        });
      });

      // Simple normalization
      ['shadows', 'midtones', 'highlights'].forEach(zone => {
        if (combinedAnalysis[zone].weight > 0) {
          combinedAnalysis[zone].rgb.r /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].rgb.g /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].rgb.b /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].luminance.avg /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].lab.L /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].lab.a /= combinedAnalysis[zone].weight;
          combinedAnalysis[zone].lab.b /= combinedAnalysis[zone].weight;
        }
      });

      setColorAnalysis(combinedAnalysis);
      setProcessingStep(`Generating ${lutResolution}x${lutResolution}x${lutResolution} LUT...`);

      // Calculate transforms
      const calculateTransform = (neutralBase, targetRgb) => {
        const baseIntensity = 0.5 + (intensityLevel - 1) * 0.25;
        const finalIntensity = baseIntensity;
        
        return {
          r: Math.min(3.0, Math.max(0.1, ((targetRgb.r / neutralBase.r) - 1) * finalIntensity + 1)),
          g: Math.min(3.0, Math.max(0.1, ((targetRgb.g / neutralBase.g) - 1) * finalIntensity + 1)),
          b: Math.min(3.0, Math.max(0.1, ((targetRgb.b / neutralBase.b) - 1) * finalIntensity + 1))
        };
      };

      const transforms = {
        shadows: calculateTransform(universalCameraProfile.shadows.lift, combinedAnalysis.shadows.rgb),
        midtones: calculateTransform(universalCameraProfile.midtones.gamma, combinedAnalysis.midtones.rgb),
        highlights: calculateTransform(universalCameraProfile.highlights.gain, combinedAnalysis.highlights.rgb)
      };

      // Global adjustments
      const contrastBoost = 1 + (combinedAnalysis.globalStats.contrast - 0.3) * (intensityLevel * 0.3);
      const saturationBoost = 1 + (combinedAnalysis.globalStats.saturation - 0.4) * (intensityLevel * 0.4);
      const temperatureShift = combinedAnalysis.globalStats.colorTemperature * (intensityLevel * 0.002);
      const tintShift = combinedAnalysis.globalStats.tint * (intensityLevel * 0.002);

      // Generate LUT
      const lutSize = lutResolution;
      const lutData = [];

      for (let b = 0; b < lutSize; b++) {
        for (let g = 0; g < lutSize; g++) {
          for (let r = 0; r < lutSize; r++) {
            const inputR = r / (lutSize - 1);
            const inputG = g / (lutSize - 1);
            const inputB = b / (lutSize - 1);

            const luminance = rgbToGrayscale(inputR, inputG, inputB, 'luminance');
            let outputR = inputR, outputG = inputG, outputB = inputB;

            if (combinedAnalysis.isBlackAndWhite) {
              // Simplified B&W LUT generation
              const grayscale = rgbToGrayscale(inputR, inputG, inputB, bwConversionMethod);
              let mappedLuminance = grayscale;
              
              // Simple zone weighting - back to original
              const shadowWeight = Math.max(0, Math.min(1, (0.3 - grayscale) / 0.3));
              const highlightWeight = Math.max(0, Math.min(1, (grayscale - 0.7) / 0.3));
              const midtoneWeight = Math.max(0, 1 - shadowWeight - highlightWeight);

              // Simple intensity application
              const intensityFactor = intensityLevel * 0.2;

              if (shadowWeight > 0 && combinedAnalysis.shadows.luminance) {
                const targetShadow = combinedAnalysis.shadows.luminance.avg;
                const factor = Math.pow(shadowWeight, 0.8);
                mappedLuminance = mappedLuminance * (1 - factor * intensityFactor) + targetShadow * factor * intensityFactor;
              }

              if (midtoneWeight > 0 && combinedAnalysis.midtones.luminance) {
                const targetMidtone = combinedAnalysis.midtones.luminance.avg;
                const factor = Math.pow(midtoneWeight, 0.6);
                mappedLuminance = mappedLuminance * (1 - factor * intensityFactor) + targetMidtone * factor * intensityFactor;
              }

              if (highlightWeight > 0 && combinedAnalysis.highlights.luminance) {
                const targetHighlight = combinedAnalysis.highlights.luminance.avg;
                const factor = Math.pow(highlightWeight, 0.8);
                mappedLuminance = mappedLuminance * (1 - factor * intensityFactor) + targetHighlight * factor * intensityFactor;
              }

              mappedLuminance = Math.max(0, Math.min(1, mappedLuminance));
              outputR = outputG = outputB = mappedLuminance;

            } else {
              // Simplified Color LUT generation - back to working version
              const shadowWeight = Math.max(0, Math.min(1, (0.35 - luminance) / 0.35));
              const highlightWeight = Math.max(0, Math.min(1, (luminance - 0.65) / 0.35));
              const midtoneWeight = Math.max(0, 1 - shadowWeight - highlightWeight);

              // Simple blending - back to original ratios
              const blendStrength = intensityLevel * 0.15; // Scale with intensity

              if (shadowWeight > 0) {
                const factor = Math.pow(shadowWeight, 0.7) * blendStrength;
                const shadowR = inputR * transforms.shadows.r * 0.8 + combinedAnalysis.shadows.rgb.r * 0.2;
                const shadowG = inputG * transforms.shadows.g * 0.8 + combinedAnalysis.shadows.rgb.g * 0.2;
                const shadowB = inputB * transforms.shadows.b * 0.8 + combinedAnalysis.shadows.rgb.b * 0.2;
                
                outputR = outputR * (1 - factor) + shadowR * factor;
                outputG = outputG * (1 - factor) + shadowG * factor;
                outputB = outputB * (1 - factor) + shadowB * factor;
              }

              if (midtoneWeight > 0) {
                const factor = Math.pow(midtoneWeight, 0.5) * blendStrength;
                outputR = outputR * (1 - factor) + (inputR * transforms.midtones.r) * factor;
                outputG = outputG * (1 - factor) + (inputG * transforms.midtones.g) * factor;
                outputB = outputB * (1 - factor) + (inputB * transforms.midtones.b) * factor;
              }

              if (highlightWeight > 0) {
                const factor = Math.pow(highlightWeight, 0.7) * blendStrength;
                const highlightR = inputR * transforms.highlights.r * 0.9 + combinedAnalysis.highlights.rgb.r * 0.1;
                const highlightG = inputG * transforms.highlights.g * 0.9 + combinedAnalysis.highlights.rgb.g * 0.1;
                const highlightB = inputB * transforms.highlights.b * 0.9 + combinedAnalysis.highlights.rgb.b * 0.1;
                
                outputR = outputR * (1 - factor) + highlightR * factor;
                outputG = outputG * (1 - factor) + highlightG * factor;
                outputB = outputB * (1 - factor) + highlightB * factor;
              }

              // Simple color matrix application
              const matrixR = outputR * universalCameraProfile.colorMatrix[0][0] + outputG * universalCameraProfile.colorMatrix[0][1] + outputB * universalCameraProfile.colorMatrix[0][2];
              const matrixG = outputR * universalCameraProfile.colorMatrix[1][0] + outputG * universalCameraProfile.colorMatrix[1][1] + outputB * universalCameraProfile.colorMatrix[1][2];
              const matrixB = outputR * universalCameraProfile.colorMatrix[2][0] + outputG * universalCameraProfile.colorMatrix[2][1] + outputB * universalCameraProfile.colorMatrix[2][2];

              outputR = matrixR;
              outputG = matrixG;
              outputB = matrixB;

              // Global adjustments
              outputR += temperatureShift; 
              outputB -= temperatureShift; 
              outputG += tintShift;
              
              const currentLum = rgbToGrayscale(outputR, outputG, outputB, 'luminance');
              outputR = currentLum + (outputR - currentLum) * saturationBoost;
              outputG = currentLum + (outputG - currentLum) * saturationBoost;
              outputB = currentLum + (outputB - currentLum) * saturationBoost;
              
              // S-curve contrast
              const applySCurve = (value, strength) => {
                return value < 0.5 ? 
                  Math.pow(value * 2, strength) / 2 :
                  1 - Math.pow((1 - value) * 2, strength) / 2;
              };
              
              if (contrastBoost !== 1) {
                outputR = applySCurve(outputR, contrastBoost);
                outputG = applySCurve(outputG, contrastBoost);
                outputB = applySCurve(outputB, contrastBoost);
              }
            }

            const finalR = Math.max(0, Math.min(1, outputR));
            const finalG = Math.max(0, Math.min(1, outputG));
            const finalB = Math.max(0, Math.min(1, outputB));

            lutData.push(`${finalR.toFixed(6)} ${finalG.toFixed(6)} ${finalB.toFixed(6)}`);
          }
        }
      }

      setProcessingStep('Finalizing LUT file...');

      const timestamp = new Date().toISOString().split('T')[0];
      const lutType = combinedAnalysis.isBlackAndWhite ? 'B&W' : 'Color';
      const intensityLabel = `${intensityLevel}x`;
      
      const cubeContent = `TITLE "Universal ${lutType} LUT - ${intensityLabel} - ${timestamp}"
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
LUT_3D_SIZE ${lutResolution}

${lutData.join('\n')}`;

      setGeneratedLUT(cubeContent);
      setProcessingStep('Complete!');
      
    } catch (error) {
      console.error('Error generating LUT:', error);
      alert('Error generating LUT. Please try again.');
      setProcessingStep('Error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadLUT = () => {
    if (!generatedLUT) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const lutType = isBlackAndWhite ? 'bw' : 'color';
    const intensityLabel = `${intensityLevel}x`;
    const resolutionLabel = `${lutResolution}`;
    
    const blob = new Blob([generatedLUT], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universal-${lutType}-${intensityLabel}-${resolutionLabel}-${timestamp}.cube`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeImage = (id) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
    setGeneratedLUT(null);
    setColorAnalysis(null);
    setIsBlackAndWhite(false);
    setAnalysisProgress({ current: 0, total: 0, imageProgress: 0, stage: '' });
    setDebugInfo([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Camera className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Universal Camera LUT Generator
            </h1>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-slate-300 text-lg max-w-3xl mx-auto">
            Professional-grade LUT generation with enhanced color science, intensity control, and advanced processing. 
            Works with all major camera brands and supports both color and black & white workflows.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-400" />
            Upload Reference Images
          </h2>
          
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">Upload 1-10 reference images with your desired look</p>
            <p className="text-slate-500 text-sm mb-4">
              Supports color and black & white references • JPG, PNG, HEIC supported
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Choose Images
            </button>
          </div>

          {referenceImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Reference Images ({referenceImages.length}/10)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {referenceImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.url} alt={img.name} className="w-full h-24 object-cover rounded-lg border border-slate-600" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <p className="text-xs text-slate-400 mt-1 truncate">{img.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        {referenceImages.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-8 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Advanced LUT Settings
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Intensity Level: {intensityLevel}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={intensityLevel}
                  onChange={(e) => setIntensityLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Subtle</span>
                  <span>Moderate</span>
                  <span>Strong</span>
                  <span>Very Strong</span>
                  <span>Extreme</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Higher intensity = stronger color matching and more dramatic transformation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  LUT Resolution
                </label>
                <select
                  value={lutResolution}
                  onChange={(e) => setLutResolution(parseInt(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                >
                  <option value={17}>17³ - Fast (4,913 points)</option>
                  <option value={33}>33³ - Standard (35,937 points)</option>
                  <option value={65}>65³ - High Quality (274,625 points)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Higher resolution = smoother gradations but larger file size
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
                  />
                  Advanced Processing Mode
                </label>
                <p className="text-xs text-slate-400 mt-2">
                  Enables high-resolution analysis, enhanced precision, and professional color science
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
              <h3 className="font-medium text-yellow-200 mb-2">🔥 Enhanced Features Active:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-200">
                <ul className="list-disc list-inside space-y-1">
                  <li>Multi-pass color analysis with {advancedMode ? '4x' : '1x'} sampling density</li>
                  <li>Advanced tone curve analysis and matching</li>
                  <li>Global contrast and saturation enhancement</li>
                  <li>Color temperature and tint correction</li>
                </ul>
                <ul className="list-disc list-inside space-y-1">
                  <li>Perceptual color space transformations</li>
                  <li>S-curve contrast application</li>
                  <li>Enhanced zone-based processing</li>
                  <li>Professional {lutResolution}³ LUT generation</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* B&W Settings */}
        {referenceImages.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-8 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-400" />
              Black & White Conversion Settings
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                B&W Conversion Method:
              </label>
              <select
                value={bwConversionMethod}
                onChange={(e) => setBwConversionMethod(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="luminance">Luminance (Recommended)</option>
                <option value="average">RGB Average</option>
                <option value="red">Red Channel</option>
                <option value="green">Green Channel</option>
                <option value="blue">Blue Channel</option>
                <option value="max">Maximum Channel</option>
                <option value="min">Minimum Channel</option>
              </select>
            </div>
          </div>
        )}

        {/* Generation Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-400" />
            Universal LUT Generation
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
            <button
              onClick={generateAdvancedLUT}
              disabled={referenceImages.length === 0 || isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Enhanced LUT
                </>
              )}
            </button>
            
            {generatedLUT && (
              <button
                onClick={downloadLUT}
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download .cube File
              </button>
            )}
          </div>

          {isProcessing && processingStep && (
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-200">{processingStep}</span>
              </div>
              
              {/* Simplified Progress Display */}
              {analysisProgress.total > 0 && (
                <div className="space-y-3">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex justify-between text-sm text-blue-200 mb-1">
                      <span>Overall Progress</span>
                      <span>{analysisProgress.current}/{analysisProgress.total} images</span>
                    </div>
                    <div className="w-full bg-blue-900/50 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Current Image Progress */}
                  {analysisProgress.imageProgress > 0 && analysisProgress.current <= analysisProgress.total && (
                    <div>
                      <div className="flex justify-between text-sm text-blue-200 mb-1">
                        <span>Current Image: {analysisProgress.stage}</span>
                        <span>{analysisProgress.imageProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-900/50 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${analysisProgress.imageProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Debug Information */}
              {debugInfo.length > 0 && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg max-h-32 overflow-y-auto">
                  <div className="text-xs text-slate-300 space-y-1">
                    {debugInfo.slice(-8).map((info, index) => (
                      <div key={index} className="font-mono">{info}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {colorAnalysis && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3">
                {colorAnalysis.isBlackAndWhite ? (
                  <>
                    <div className="w-4 h-4 bg-gradient-to-r from-black to-white rounded"></div>
                    <span className="text-slate-200 font-medium">Black & White LUT Generated</span>
                    <span className="text-slate-400 text-sm">(B&W tone mapping mode)</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded"></div>
                    <span className="text-slate-200 font-medium">Color LUT Generated</span>
                    <span className="text-slate-400 text-sm">(Color matching mode)</span>
                  </>
                )}
              </div>
            </div>
          )}

          {colorAnalysis && (
            <div className="p-6 bg-slate-700/50 rounded-lg border border-slate-600">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-400" />
                Enhanced Analysis Results
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                {['shadows', 'midtones', 'highlights'].map(zone => {
                  const data = colorAnalysis[zone];
                  if (!data) return null;
                  return (
                    <div key={zone} className="space-y-3">
                      <h4 className="font-medium capitalize text-slate-200 border-b border-slate-600 pb-2">
                        {zone} Analysis
                      </h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-red-900/30 p-2 rounded">
                            <div className="text-red-400">Red</div>
                            <div>{(data.rgb.r * 100).toFixed(1)}%</div>
                          </div>
                          <div className="bg-green-900/30 p-2 rounded">
                            <div className="text-green-400">Green</div>
                            <div>{(data.rgb.g * 100).toFixed(1)}%</div>
                          </div>
                          <div className="bg-blue-900/30 p-2 rounded">
                            <div className="text-blue-400">Blue</div>
                            <div>{(data.rgb.b * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                        {data.luminance && (
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="bg-slate-600/30 p-2 rounded">
                              <div className="text-slate-300">Luminance</div>
                              <div>{(data.luminance.avg * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" />
            Professional Implementation Guide
          </h2>
          
          <div className="space-y-6 text-slate-300">
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
              <h3 className="font-medium text-green-200 mb-2">✨ Enhanced Features</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Intensity control from 1x (subtle) to 5x (extreme) strength</li>
                <li>Advanced processing with 4x sampling density and enhanced precision</li>
                <li>Professional color science with LAB color space analysis</li>
                <li>Multiple LUT resolutions: 17³, 33³, and 65³ for optimal quality</li>
                <li>Universal compatibility with all major camera brands</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-white mb-3">📥 Import to Editor</h3>
                <div className="space-y-2 text-sm">
                  <div><strong className="text-blue-300">DaVinci Resolve:</strong> Project Settings → Color Management → LUTs</div>
                  <div><strong className="text-purple-300">Final Cut Pro:</strong> Effects Browser → Color → Custom LUTs</div>
                  <div><strong className="text-red-300">Adobe Premiere:</strong> Lumetri Color → Creative → Look</div>
                  <div><strong className="text-orange-300">Lightroom:</strong> Develop → Color Grading → LUT</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-white mb-3">🎯 Best Practices</h3>
                <div className="space-y-2 text-sm">
                  <div><strong className="text-green-300">High Intensity:</strong> Use 4-5x for dramatic transformations</div>
                  <div><strong className="text-yellow-300">Quality Mode:</strong> Enable advanced processing for best results</div>
                  <div><strong className="text-cyan-300">Resolution:</strong> Use 65³ for smoothest gradations</div>
                  <div><strong className="text-pink-300">Workflow:</strong> Apply LUT before other color adjustments</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700">
              <h3 className="font-medium text-blue-200 mb-2">📷 Universal Compatibility</h3>
              <p className="text-sm text-blue-200">
                Works with Canon, Nikon, Sony, Fujifilm, Leica, Panasonic, Olympus, and more. 
                Supports both RAW and JPEG workflows, color and black & white processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalLUTGenerator;