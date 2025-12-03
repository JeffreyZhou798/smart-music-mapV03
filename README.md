# Smart Music Map 🎵

An AI-powered web application for musical structure analysis and visual mapping, combining Orff pedagogy with modern AI techniques.

## Features

- **MusicXML Analysis**: Parse and analyze musical scores from .musicxml and .mxl files
- **Audio Support**: Optional MP3 audio for synchronized playback
- **Structure Detection**: Automatic detection of musical structures (motives, phrases, periods, themes)
- **Form Recognition**: Identify musical forms (Sonata, Rondo, Binary, Ternary, etc.)
- **Visual Mapping**: Create personalized visual representations of musical structures
- **AI Recommendations**: Get visual scheme recommendations based on musical features
- **Preference Learning**: System learns your preferences during the session
- **Export Options**: Export as JSON, HTML, SVG, or bundled ZIP

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **State Management**: Pinia
- **Audio**: Tone.js, Meyda.js
- **Styling**: CSS3 with CSS Variables

## Architecture

The application follows a three-layer architecture:

1. **Perception Layer**: MusicXML parsing, audio decoding, feature extraction
2. **Logic Layer**: Rule engine for music theory, structure analysis, DTW alignment
3. **Operation Layer**: Preference learning, visual scheme recommendations

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Upload Files**: Drag and drop or click to upload a MusicXML file (.musicxml or .mxl)
2. **Analyze**: Click "Analyze Structure" to detect musical structures
3. **Explore**: Navigate through the structure tree and view analysis results
4. **Customize**: Select visual schemes for each structure element
5. **Playback**: Play the visual map synchronized with audio
6. **Export**: Save your work in various formats

## Music Theory Support

The system recognizes:

- **Cadences**: Perfect Authentic, Imperfect Authentic, Half, Deceptive
- **Periods**: Parallel, Contrasting, Sequential
- **Forms**: One-part, Binary, Ternary, Sonata, Rondo, Variation

## Bilingual Terminology

Structure labels are displayed in both English and Chinese:
- Motive (动机)
- Sub-phrase (乐节)
- Phrase (乐句)
- Period (乐段)
- Theme (主题)

## License

MIT
