/**
 * Converte uma cor hexadecimal para rgba.
 * @param {string} hex - Cor em formato hexadecimal (ex: '#00ff88')
 * @param {number} alpha - Opacidade (0 a 1)
 * @returns {string} Cor em formato rgba
 */
export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 255;
  const b = parseInt(hex.slice(5, 7), 16) || 136;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
