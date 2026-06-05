// Managed by Razael-Fox Bot

/**
 * Strategy to always return a single specific color.
 */
export class SpecificColor {
  /**
   * @param {number} color Hex color code (e.g. 0x6e4cc1)
   */
  constructor(color) {
    this.color = color;
  }

  getColor() {
    return this.color;
  }
}

/**
 * Strategy to cycle through a list of colors sequentially.
 */
export class SequentialColor {
  /**
   * @param {number[]} colors Array of hex color codes
   */
  constructor(colors) {
    this.colors = colors;
    this.currentIndex = 0;
  }

  getColor() {
    if (!this.colors || this.colors.length === 0) {
      return 0x000000;
    }
    const color = this.colors[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.colors.length;
    return color;
  }
}

/**
 * Strategy to select a random color from a list of colors.
 */
export class RandomColor {
  /**
   * @param {number[]} colors Array of hex color codes
   */
  constructor(colors) {
    this.colors = colors;
  }

  getColor() {
    if (!this.colors || this.colors.length === 0) {
      return 0x000000;
    }
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    return this.colors[randomIndex];
  }
}
