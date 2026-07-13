---
name: Kinetic Entry
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#41493a'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#717a68'
  outline-variant: '#c1c9b5'
  surface-tint: '#316b00'
  primary: '#316b00'
  on-primary: '#ffffff'
  primary-container: '#9de46c'
  on-primary-container: '#2e6600'
  inverse-primary: '#93d963'
  secondary: '#5d6145'
  on-secondary: '#ffffff'
  secondary-container: '#dfe3c0'
  on-secondary-container: '#616549'
  tertiary: '#5e5f55'
  on-tertiary: '#ffffff'
  tertiary-container: '#d1d2c5'
  on-tertiary-container: '#595a50'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#aef67b'
  primary-fixed-dim: '#93d963'
  on-primary-fixed: '#0a2000'
  on-primary-fixed-variant: '#235100'
  secondary-fixed: '#e2e5c3'
  secondary-fixed-dim: '#c5c9a8'
  on-secondary-fixed: '#1a1d08'
  on-secondary-fixed-variant: '#45492f'
  tertiary-fixed: '#e3e3d6'
  tertiary-fixed-dim: '#c7c7bb'
  on-tertiary-fixed: '#1a1c14'
  on-tertiary-fixed-variant: '#46483e'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is anchored in a **Corporate / Modern** aesthetic, optimized for clarity, security, and efficiency in visitor management. It balances a high-tech, professional atmosphere with a welcoming, approachable feel.

The visual narrative focuses on "The Seamless Flow"—using generous whitespace to reduce cognitive load and clear, bold information hierarchy to guide users through check-in and administrative tasks. The style is sleek and functional, utilizing soft geometric forms and a restrained color palette to evoke a sense of trust and contemporary sophistication.

## Colors
The palette is derived from the brand's vibrant lime-green, used strategically as a high-visibility primary color for actions and status indicators.

- **Primary:** The signature green (#9DE46C) is used for primary buttons, success states, and key brand highlights.
- **Secondary:** A deep, earthy olive-charcoal (#3D4128) provides professional contrast for headings and navigation elements.
- **Tertiary/Neutral:** Darker tones (#1A1C14) are reserved for high-contrast text, while soft grays and off-whites define the UI structure.
- **Backgrounds:** A subtle tinted white (#F9FAF7) keeps the interface feeling fresh and expansive compared to pure white.

## Typography
The typography system uses **Hanken Grotesk** for headings to provide a sharp, contemporary edge, while **Inter** is utilized for body and UI labels due to its exceptional legibility and systematic feel.

Headlines should use tight letter spacing and a heavy weight to command attention. Body text remains open and airy. For the visitor-facing kiosk experience, `body-lg` is the preferred default size to ensure readability from a standing distance.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model based on a 12-column structure for desktop and a 4-column structure for mobile.

- **Desktop (1440px+):** 12 columns, 24px gutters, and 80px side margins to create a focused content area.
- **Tablet (768px - 1439px):** 8 columns, 20px gutters, 40px margins.
- **Mobile (< 767px):** 4 columns, 16px gutters, 20px margins.

Vertical rhythm follows an 8px base unit. Generous "XL" spacing should be used between major sections to emphasize the clean, professional aesthetic.

## Elevation & Depth
Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

- **Surface Level (Base):** Background color (#F9FAF7).
- **Surface Level (Raised):** Pure white (#FFFFFF) cards with a subtle 1px border (#E5E7EB) and a soft, diffused shadow (0px 4px 20px rgba(61, 65, 40, 0.05)).
- **Overlay Level:** Used for modals and dropdowns. Features a more pronounced shadow (0px 12px 32px rgba(61, 65, 40, 0.12)) to lift the component significantly above the UI.

Avoid heavy blacks in shadows; use the secondary olive-charcoal color at low opacity to keep shadows feeling "natural" and integrated.

## Shapes
The shape language is consistently **Rounded**, reflecting a modern and user-friendly interface.

- **Buttons & Inputs:** Use `0.5rem` (8px) corner radius.
- **Cards & Containers:** Use `rounded-lg` (1rem / 16px) for larger surfaces.
- **Status Pills:** Use `rounded-full` (999px) for a distinct "chip" appearance.

This curvature softens the professional structure of the system, making it appear more accessible to visitors while maintaining its architectural integrity.

## Components

### Buttons
- **Primary:** Background #9DE46C, Text #3D4128 (High contrast), Bold weight.
- **Secondary:** Background #FFFFFF, Border 1px #3D4128, Text #3D4128.
- **Ghost:** No background, Text #3D4128, subtle hover state with 5% opacity of secondary color.

### Input Fields
- White background, 1px border (#D1D5DB). On focus: border becomes #9DE46C with a soft 4px glow. Labels are `label-md` placed above the field.

### Cards
- White background, 16px rounded corners, subtle ambient shadow. Used for visitor profiles, upcoming meetings, and analytics modules.

### Status Chips
- Small, rounded-pill containers. 
- *Active:* Light green background with dark green text.
- *Pending:* Light amber background with dark brown text.
- *Checked Out:* Light gray background with dark gray text.

### Navigation
- Sidebar navigation for the admin dashboard uses the dark secondary color (#3D4128) as a background for a high-contrast, high-security feel, while the top bar remains clean and light.