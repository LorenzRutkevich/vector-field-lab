/* =============================================================================
 * i18n.js: runtime English / German localisation (VF.I18n)
 * -----------------------------------------------------------------------------
 * Design: the ENGLISH source strings are the lookup keys. t(s) returns the
 * German translation when the language is 'de' and an entry exists, otherwise
 * the string itself. So English mode is always perfect, and any string not yet
 * translated simply shows in English (graceful fallback, never broken).
 *
 * The UI routes all control text through t() at the helper level (sectionTitle,
 * field, checkbox, button, select), so the whole control surface translates
 * with the dictionary below. Panels are rebuilt and the active view re-rendered
 * on a language switch; the help manual is swapped wholesale.
 * ES3/JScript-safe (no getters, arrows, const, or template literals).
 * ========================================================================== */
(function (VF) {
  'use strict';

  var lang = 'en';

  /* --- German dictionary: english source -> german ------------------------- */
  var DE = {
    /* tabs */
    'Fields': 'Felder', 'Matrix': 'Matrix', 'Functions': 'Funktionen',
    'Manifolds': 'Mannigfaltigkeiten', 'Minkowski': 'Minkowski', 'Quantum': 'Quantum',
    'Phase': 'Phase', 'Fourier': 'Fourier', 'Waves': 'Wellen', 'Modes': 'Moden', 'Scatter': 'Streuung',

    /* top bar */
    'Reset view': 'Ansicht zurücksetzen', 'Help': 'Hilfe', '⤓ Save': '⤓ Speichern',
    'save this view as a PNG image': 'diese Ansicht als PNG-Bild speichern',
    'toggle light / dark': 'hell / dunkel umschalten', 'reset camera (R)': 'Kamera zurücksetzen (R)',
    'self-tests': 'Selbsttests',

    /* HUD hints */
    'drag&nbsp;·&nbsp;orbit&nbsp;&nbsp;|&nbsp;&nbsp;right-drag&nbsp;·&nbsp;pan&nbsp;&nbsp;|&nbsp;&nbsp;wheel&nbsp;·&nbsp;zoom':
      'ziehen&nbsp;·&nbsp;drehen&nbsp;&nbsp;|&nbsp;&nbsp;rechts-ziehen&nbsp;·&nbsp;verschieben&nbsp;&nbsp;|&nbsp;&nbsp;Rad&nbsp;·&nbsp;zoomen',
    'drag&nbsp;β&nbsp;·&nbsp;boost&nbsp;&nbsp;|&nbsp;&nbsp;Space&nbsp;·&nbsp;animate&nbsp;&nbsp;|&nbsp;&nbsp;flat 1+1 spacetime':
      'β&nbsp;ziehen&nbsp;·&nbsp;Boost&nbsp;&nbsp;|&nbsp;&nbsp;Leertaste&nbsp;·&nbsp;animieren&nbsp;&nbsp;|&nbsp;&nbsp;flache 1+1-Raumzeit',
    'flat 2-D view&nbsp;&nbsp;|&nbsp;&nbsp;Space&nbsp;·&nbsp;play/animate':
      'flache 2-D-Ansicht&nbsp;&nbsp;|&nbsp;&nbsp;Leertaste&nbsp;·&nbsp;abspielen',

    /* common section titles / controls */
    'Presets': 'Voreinstellungen', 'Display': 'Darstellung', 'Show': 'Anzeigen', 'Values': 'Werte',
    'Readout': 'Auswertung', 'Colormap': 'Farbskala', 'Domain ±R': 'Bereich ±R', 'Overlays': 'Überlagerungen',
    't': 't', 'speed': 'Geschwindigkeit', 'Type': 'Typ', 'Kind': 'Art', 'View': 'Ansicht',
    'Parameters': 'Parameter', 'Animate': 'Animieren', 'Evolve': 'Entwickeln',
    '▶ Play': '▶ Abspielen', '❚❚ Pause': '❚❚ Pause', 'Arrow scale': 'Pfeil-Skala',
    'Resolution': 'Auflösung', 'Degree': 'Grad',

    /* Fields lab */
    'Field type': 'Feldtyp', 'Vector field  F(x,y,z)': 'Vektorfeld  F(x,y,z)', 'Scalar field  f(x,y,z)': 'Skalarfeld  f(x,y,z)',
    'Operator': 'Operator', 'what to display': 'was angezeigt wird',
    'none: show the field': 'keiner: das Feld zeigen',
    '∇f: gradient (scalar → vector)': '∇f: Gradient (Skalar → Vektor)',
    '∇·F: divergence (vector → scalar)': '∇·F: Divergenz (Vektor → Skalar)',
    '∇×F: curl / rotation (vector → vector)': '∇×F: Rotation (Vektor → Vektor)',
    '∇²: Laplacian': '∇²: Laplace',
    '|F|: magnitude (vector → scalar)': '|F|: Betrag (Vektor → Skalar)',
    'Values at a point': 'Werte an einem Punkt',
    'Show ∇·F, ∇×F, … at a point P': '∇·F, ∇×F, … an einem Punkt P zeigen',
    'Time  t': 'Zeit  t',
    'Normalize arrow lengths (color = magnitude)': 'Pfeillängen normieren (Farbe = Betrag)',
    'Arrow layout': 'Pfeil-Anordnung', 'plane = clearest for circles': 'Ebene = am klarsten für Kreise',
    'volume (3D grid)': 'Volumen (3D-Gitter)', 'plane (dense 2D slice)': 'Ebene (dichter 2D-Schnitt)',
    'Arrow grid N': 'Pfeilgitter N', 'Plane': 'Ebene', 'x = const': 'x = const', 'y = const': 'y = const', 'z = const': 'z = const',
    'Plane position': 'Ebenen-Position', 'Plane density': 'Ebenen-Dichte',
    'Scalar view': 'Skalar-Ansicht', 'volume points': 'Volumen-Punkte', 'isosurface shell': 'Isofläche', 'slice plane': 'Schnittebene',
    'Volume grid': 'Volumen-Gitter', 'Iso level': 'Iso-Niveau', 'Slice plane': 'Schnittebene', 'Slice position': 'Schnitt-Position',
    'Streamlines of F (field lines)': 'Stromlinien von F (Feldlinien)', 'Streamline density': 'Stromlinien-Dichte',
    'Show axes / box / grid': 'Achsen / Box / Gitter zeigen',
    'Line integral  ∮ F·dr': 'Linienintegral  ∮ F·dr', 'Integrate F over a curve': 'F über eine Kurve integrieren',
    'x(t)': 'x(t)', 'y(t)': 'y(t)', 'z(t)': 'z(t)', 't from … to': 't von … bis', '▶ Play trace': '▶ Spur abspielen', 'trace t': 'Spur t',
    'Field designer': 'Feld-Designer', 'Property': 'Eigenschaft', 'guaranteed by construction': 'durch Konstruktion garantiert',
    'Drop bodies into the field': 'Körper ins Feld fallen lassen',
    'Reading of F': 'Deutung von F', 'what the arrows mean physically': 'was die Pfeile physikalisch bedeuten',
    'F = velocity field: fluid flow': 'F = Geschwindigkeitsfeld: Strömung',
    'F = force field: Newton m·ẍ = F': 'F = Kraftfeld: Newton m·ẍ = F',
    '⬇ Drop at P': '⬇ Bei P fallen lassen', 'Clear bodies': 'Körper löschen',
    'a body drops exactly at the point P above': 'ein Körper startet genau am obigen Punkt P',
    '▶ Release bodies': '▶ Körper loslassen', '❚❚ Pause bodies': '❚❚ Körper anhalten',
    'body size': 'Körpergröße', 'Grow / shrink with ∇·F (volume)': 'Wachsen / Schrumpfen mit ∇·F (Volumen)',
    'Deform with ∇F (shear + stretch)': 'Verformen mit ∇F (Scherung + Dehnung)', 'mass m': 'Masse m',
    'v₀ at drop': 'v₀ beim Start', 'initial velocity (try a tangential kick)': 'Anfangsgeschwindigkeit (probiere einen tangentialen Stoß)',
    'Trails (pathlines)': 'Spuren (Bahnlinien)',

    /* Matrix lab */
    'Matrix  A  (3×3)': 'Matrix  A  (3×3)', 'Build a rotation  R = exp(θ K)': 'Rotation bauen  R = exp(θ K)',
    'Axis (x, y, z)': 'Achse (x, y, z)', 'Angle θ (deg)': 'Winkel θ (Grad)', 'Apply rotation': 'Rotation anwenden',
    'Rotation by': 'Rotation um', 'about axis': 'um die Achse',
    'Transformed unit cube': 'Transformierter Einheitswürfel', 'Basis vectors → columns of A': 'Basisvektoren → Spalten von A',
    'Eigenvectors': 'Eigenvektoren', 'Vector field  A·x': 'Vektorfeld  A·x', 'Flow  exp(tA)·x': 'Fluss  exp(tA)·x',
    'Animate the one-parameter flow': 'Einparametrigen Fluss animieren', '▶ Play flow': '▶ Fluss abspielen',
    '❚❚ Pause flow': '❚❚ Fluss anhalten', 'flow speed': 'Fluss-Geschwindigkeit',

    /* Functions lab */
    'f(x): curve': 'f(x): Kurve', 'f(x,y): surface': 'f(x,y): Fläche', 'f(x,y,z): volume': 'f(x,y,z): Volumen',
    'F(x,y,z): vector field · Jacobian': 'F(x,y,z): Vektorfeld · Jacobi',
    'primary: full analysis': 'primär: volle Analyse', '+ Add function': '+ Funktion hinzufügen',
    'Expansion point': 'Entwicklungspunkt', 'Evaluation point': 'Auswertungspunkt', 'Taylor': 'Taylor', '0–8': '0–8',
    'Show function': 'Funktion zeigen', 'Show Taylor approximation': 'Taylor-Näherung zeigen',
    'Show gradient vector': 'Gradientenvektor zeigen', 'Show field arrows': 'Feldpfeile zeigen',
    'Show Jacobian (local cube at P)': 'Jacobi-Matrix zeigen (lokaler Würfel bei P)', 'Axis scale': 'Achsen-Skala',
    'scale x': 'Skala x', 'scale y': 'Skala y', 'scale z': 'Skala z',

    /* Manifolds lab */
    'Parametric surface  φ(u,v)': 'Parametrische Fläche  φ(u,v)', 'Level set  g(x,y,z) = c': 'Niveaumenge  g(x,y,z) = c',
    'Curve  r(t)': 'Kurve  r(t)',

    /* Quantum lab */
    'Potential  V(x)': 'Potential  V(x)',
    'Eigenstates  ψₙ, Eₙ': 'Eigenzustände  ψₙ, Eₙ', 'Wave packet  ψ(x,t)': 'Wellenpaket  ψ(x,t)',
    'Superposition: beats': 'Superposition: Schwebung', 'States shown': 'Gezeigte Zustände',
    'Plot |ψ|² (probability density)': '|ψ|² zeichnen (Wahrscheinlichkeitsdichte)', '▶ Evolve ψ(x,t)': '▶ ψ(x,t) entwickeln',
    'start x₀': 'Start x₀', 'width σ': 'Breite σ', 'momentum k₀': 'Impuls k₀', 'kinetic E ≈ k₀²/2': 'kinetische E ≈ k₀²/2',
    'states  n₁, n₂': 'Zustände  n₁, n₂', 'equal mix': 'gleiche Mischung', 'Domain': 'Bereich',
    'Box half-width L': 'Kasten-Halbbreite L', 'walls at ±L': 'Wände bei ±L', 'Grid points N': 'Gitterpunkte N', 'accuracy': 'Genauigkeit',
    'Levels': 'Niveaus',

    /* Phase lab */
    'Excite': 'Anregen',

    /* Waves lab */
    'Equation': 'Gleichung', 'wave  u_tt = c²·u_xx': 'Welle  u_tt = c²·u_xx',
    'heat / diffusion  u_t = D·u_xx': 'Wärme / Diffusion  u_t = D·u_xx', 'Schrödinger  iψ_t = −½·ψ_xx': 'Schrödinger  iψ_t = −½·ψ_xx',
    'u₀(x)  on [0, L]': 'u₀(x)  auf [0, L]', 'v₀(x)  initial velocity': 'v₀(x)  Anfangsgeschwindigkeit',
    '▶ Evolve u(x,t)': '▶ u(x,t) entwickeln', 'Length L': 'Länge L', 'ends held at 0': 'Enden auf 0 gehalten',
    'wave speed c': 'Wellengeschwindigkeit c', 'diffusivity D': 'Diffusivität D', 'Modes N': 'Moden N',
    'how many sines represent u₀': 'wie viele Sinus u₀ darstellen', 'Ghost of u₀': 'Schatten von u₀',
    'Mode spectrum |αₙ(t)|': 'Moden-Spektrum |αₙ(t)|',

    /* Modes lab */
    'Chain': 'Kette', 'Masses N': 'Massen N', 'Mass pattern': 'Massen-Muster',
    'equal masses': 'gleiche Massen', 'diatomic  m, 3m alternating': 'zweiatomig  m, 3m abwechselnd',
    'impurity  (centre mass 5×)': 'Fremdatom  (Mittelmasse 5×)', 'Boundary': 'Rand',
    'fixed walls': 'feste Wände', 'free ends': 'freie Enden', 'free ends → ω₁ = 0 zero mode': 'freie Enden → ω₁ = 0 Nullmode',
    'spring k': 'Feder k', 'pendulum g/ℓ': 'Pendel g/ℓ', 'adds m(g/ℓ)·u restoring: coupled pendula': 'fügt m(g/ℓ)·u-Rückstellung hinzu: gekoppelte Pendel',
    'mode n': 'Mode n', 'Excite mode n': 'Mode n anregen', 'Pluck mass #': 'Masse # anzupfen', 'mass # to pluck': 'anzuzupfende Masse #',
    'chain  u(t)': 'Kette  u(t)', 'dispersion  ω(q)': 'Dispersion  ω(q)',
    'Mode-shape envelope': 'Moden-Einhüllende', 'Participation |cₙ|': 'Beteiligung |cₙ|',

    /* Scatter lab */
    'V(r)': 'V(r)', 'must → 0 as r → ∞': 'muss → 0 für r → ∞', 'Beam': 'Strahl',
    'Energy E = ½v∞²': 'Energie E = ½v∞²', 'max impact parameter': 'max. Stoßparameter', 'beam rays': 'Strahlen',
    'beam: trajectories': 'Strahl: Bahnen', 'deflection function Θ(b)': 'Ablenkfunktion Θ(b)', 'cross-section dσ/dΩ': 'Wirkungsquerschnitt dσ/dΩ',
    '▶ Fire the beam': '▶ Strahl abschießen', '❚❚ Pause': '❚❚ Pause',
    'Annotate a ray: impact parameter b, scattering angle θ, r_min': 'Strahl beschriften: Stoßparameter b, Streuwinkel θ, r_min',
    'annotated b': 'beschriftetes b', 'slide the ray through the beam': 'den Strahl durch das Bündel schieben',

    /* Custom points */
    'Custom points': 'Eigene Punkte',
    'Mark locations in the view. They stay in place across every tab.': 'Markiere Orte in der Ansicht. Sie bleiben über alle Reiter erhalten.',
    'Add': 'Hinzufügen', 'Clear all points': 'Alle Punkte löschen',

    /* notes (per lab intro) */
    'A matrix A defines a linear vector field F(x) = A·x. Its columns are the images of the basis vectors; its exp(tA) generates the flow.':
      'Eine Matrix A definiert ein lineares Vektorfeld F(x) = A·x. Ihre Spalten sind die Bilder der Basisvektoren; exp(tA) erzeugt den Fluss.',
    'Scalar functions (Taylor, gradient, Hessian), vector maps (full Jacobian, div, curl) and parametric curves with line integrals ∮F·dr, all via exact automatic differentiation.':
      'Skalare Funktionen (Taylor, Gradient, Hesse), Vektorabbildungen (volle Jacobi-Matrix, div, rot) und parametrische Kurven mit Linienintegralen ∮F·dr, alles über exakte automatische Differentiation.',

    /* norms & piecewise (Functions lab) */
    'Norm ‖·‖ and piecewise': 'Norm ‖·‖ und Fallunterscheidung',
    'Write ||a, b, …|| in any expression: it uses the norm chosen here. Fixed variants: norm(…), norm1(…), norminf(…), normp(p, …). Piecewise definitions: if(cond, a, b) or cases(c₁, v₁, …, else); only the active branch is evaluated.':
      'Schreibe ||a, b, …|| in einen beliebigen Ausdruck: es gilt die hier gewählte Norm. Feste Varianten: norm(…), norm1(…), norminf(…), normp(p, …). Fallunterscheidungen: if(Bedingung, a, b) oder cases(B₁, W₁, …, sonst); nur der aktive Zweig wird ausgewertet.',
    'Euclidean √(Σxᵢ²): p = 2': 'euklidisch √(Σxᵢ²): p = 2',
    'taxicab Σ|xᵢ|: p = 1': 'Betragssummennorm Σ|xᵢ|: p = 1',
    'maximum max|xᵢ|: p = ∞': 'Maximumsnorm max|xᵢ|: p = ∞',
    'p-norm (Σ|xᵢ|ᵖ)^(1/p)': 'p-Norm (Σ|xᵢ|ᵖ)^(1/p)',
    'try f = ||x,y|| and switch the norm: the level sets are the unit balls':
      'probiere f = ||x,y|| und wechsle die Norm: die Niveaumengen sind die Einheitskugeln',
    'piecewise (cases)': 'stückweise (cases)',
    'norm cone ‖(x,y)‖': 'Normkegel ‖(x,y)‖',
    'xy/‖(x,y)‖ at 0': 'xy/‖(x,y)‖ bei 0',

    /* extra functions: shared scale + colours */
    'All plotted functions share one vertical scale (so their heights stay comparable): adding a function with much larger values compresses the others. Click a swatch to change a colour.':
      'Alle dargestellten Funktionen teilen sich eine Höhenskala (damit die Höhen vergleichbar bleiben): eine Funktion mit viel größeren Werten staucht die anderen. Klicke auf ein Farbfeld, um die Farbe zu ändern.',
    'curve colour': 'Kurvenfarbe', 'marker colour': 'Markerfarbe',

    /* constraints & constrained extrema (Functions lab) */
    'Constraints (Nebenbedingungen)': 'Nebenbedingungen',
    'Each row is one constraint; several rows combine with AND. An inequality like x^2+y^2 <= 4 or 2 < x^2+y^2 < 9 clips the graph to the region where it holds; an equality like x^2+y^2 = 4 draws the constraint curve on the surface. Boundaries are drawn in red, the Lagrange candidates ∇f = λ·∇g in yellow.':
      'Jede Zeile ist eine Nebenbedingung; mehrere Zeilen werden mit UND verknüpft. Eine Ungleichung wie x^2+y^2 <= 4 oder 2 < x^2+y^2 < 9 beschneidet den Graphen auf ihren Gültigkeitsbereich; eine Gleichung wie x^2+y^2 = 4 zeichnet die Zwangskurve auf die Fläche. Ränder erscheinen rot, die Lagrange-Kandidaten ∇f = λ·∇g gelb.',
    '+ Add constraint': '+ Nebenbedingung hinzufügen',
    'Constrained extrema (Lagrange)': 'Extrema unter Nebenbedingungen (Lagrange)',
    'Candidates solve ∇f = λ·∇g on the red curve: there the level line of f is tangent to the constraint, so f has zero slope along it.':
      'Kandidaten lösen ∇f = λ·∇g auf der roten Kurve: Dort berührt die Niveaulinie von f die Nebenbedingung; entlang der Kurve hat f dort die Steigung 0.',
    'The constraints have no boundary points inside the domain. Raise ±R.':
      'Die Nebenbedingungen haben keine Randpunkte im Bereich. Vergrößere ±R.',
    'No sign change of ∇f × ∇g found along the curve (within the domain).':
      'Kein Vorzeichenwechsel von ∇f × ∇g entlang der Kurve gefunden (im Bereich).',
    'max along the constraint': 'Maximum entlang der Nebenbedingung',
    'min along the constraint': 'Minimum entlang der Nebenbedingung',
    'Along the constraints:': 'Entlang der Nebenbedingungen:',
    'The curve leaves the domain: endpoints at the domain edge are cut off, not candidates.':
      'Die Kurve verlässt den Bereich: Endpunkte am Bereichsrand sind abgeschnitten, keine Kandidaten.',
    'P violates the constraints: the graph is hidden there, but f and its derivatives are still defined.':
      'P verletzt die Nebenbedingungen: der Graph ist dort ausgeblendet, f und seine Ableitungen sind aber weiterhin definiert.',
    'saddle + circle g = 4': 'Sattel + Kreis g = 4',
    'region 2 < x²+y² < 9': 'Region 2 < x²+y² < 9',
    'paraboloid on disk': 'Paraboloid auf Kreisscheibe',
    'plane on sphere r = 3': 'Ebene auf Sphäre r = 3',
    'Candidates solve ∇f = λ·∇g on the constraint surface: there the level set of f is tangent to {g = c}, so f has zero slope along the surface. At each candidate the arrows show ∇f (magenta) ∥ ∇g (cyan).':
      'Kandidaten lösen ∇f = λ·∇g auf der Nebenbedingungs-Fläche: Dort berührt die Niveaumenge von f die Fläche {g = c}; entlang der Fläche hat f die Steigung 0. An jedem Kandidaten zeigen die Pfeile ∇f (magenta) ∥ ∇g (cyan).',
    'No candidates found on the constraint surface (within the domain).':
      'Keine Kandidaten auf der Nebenbedingungs-Fläche gefunden (im Bereich).',
    'f is constant along the constraint surface: ∇f ∥ ∇g everywhere, so every point is a candidate.':
      'f ist entlang der Nebenbedingungs-Fläche konstant: überall gilt ∇f ∥ ∇g, jeder Punkt ist ein Kandidat.',

    /* continuity classification (Functions lab) */
    'Continuity (Stetigkeit)': 'Stetigkeit',
    'Classifies f on the plotted domain: Lipschitz ⊂ uniformly continuous ⊂ continuous. Jumps and poles are located by bisection; the Lipschitz bound sup ‖∇f‖ is checked by zooming in on the steepest point.':
      'Klassifiziert f auf dem dargestellten Bereich: Lipschitz ⊂ gleichmäßig stetig ⊂ stetig. Sprünge und Pole werden per Bisektion lokalisiert; die Lipschitz-Schranke sup ‖∇f‖ wird durch Hineinzoomen an der steilsten Stelle geprüft.',
    'Classify continuity on the plotted domain': 'Stetigkeit auf dem dargestellten Bereich klassifizieren',
    'Continuity on the plotted domain': 'Stetigkeit auf dem dargestellten Bereich',
    'Not enough defined points in the domain to classify.': 'Zu wenige definierte Punkte im Bereich für eine Klassifikation.',
    'f is Lipschitz continuous on the plotted domain: the strongest of the three classes.':
      'f ist auf dem dargestellten Bereich Lipschitz-stetig: die stärkste der drei Klassen.',
    'f is uniformly continuous on the plotted domain, but not Lipschitz.':
      'f ist auf dem dargestellten Bereich gleichmäßig stetig, aber nicht Lipschitz-stetig.',
    'f is continuous at every point of its domain, but not uniformly continuous.':
      'f ist in jedem Punkt seines Definitionsbereichs stetig, aber nicht gleichmäßig stetig.',
    'f is not continuous on the plotted domain.': 'f ist auf dem dargestellten Bereich nicht stetig.',
    'continuous': 'stetig', 'uniformly continuous': 'gleichmäßig stetig', 'Lipschitz continuous': 'Lipschitz-stetig',
    'f jumps, the gap survives every refinement of the window:':
      'f springt, die Lücke überlebt jede Verfeinerung des Fensters:',
    'no jump survives refinement: small input changes give small value changes at every point of the domain.':
      'kein Sprung überlebt die Verfeinerung: kleine Änderungen des Arguments ergeben kleine Änderungen von f, in jedem Punkt des Bereichs.',
    '(f is undefined at some points; continuity holds on the defined part.)':
      '(f ist an einigen Stellen nicht definiert; Stetigkeit gilt auf dem definierten Teil.)',
    'fails automatically: uniform continuity implies continuity.':
      'entfällt automatisch: gleichmäßige Stetigkeit impliziert Stetigkeit.',
    'the domain is bounded and f is continuous up to its boundary ⇒ uniformly continuous by Heine–Cantor: one δ(ε) works everywhere.':
      'der Bereich ist beschränkt und f bis zum Rand stetig ⇒ gleichmäßig stetig nach Heine–Cantor: ein δ(ε) funktioniert überall.',
    '(the isolated undefined points are removable: f extends continuously across them.)':
      '(die isolierten Definitionslücken sind hebbar: f setzt sich stetig über sie fort.)',
    'the values blow up near the marked point, so for small ε no single δ works there:':
      'die Werte explodieren nahe der markierten Stelle, für kleines ε funktioniert dort kein einheitliches δ:',
    'f oscillates with non-vanishing amplitude at ever finer scales near':
      'f oszilliert mit nicht verschwindender Amplitude auf immer feineren Skalen nahe',
    'no single δ(ε) can work.': 'kein einheitliches δ(ε) kann funktionieren.',
    'the slope is bounded, mean value theorem: |f(x) − f(y)| ≤ L·|x − y| with':
      'die Steigung ist beschränkt, Mittelwertsatz: |f(x) − f(y)| ≤ L·|x − y| mit',
    'fails automatically: Lipschitz implies uniform continuity.':
      'entfällt automatisch: Lipschitz-Stetigkeit impliziert gleichmäßige Stetigkeit.',
    'no Lipschitz constant works: the slope grows beyond every bound near the marked point':
      'keine Lipschitz-Konstante funktioniert: die Steigung wächst nahe der markierten Stelle über jede Schranke',
    'distance': 'Abstand',
    'Outlook: beyond the plotted domain the slope keeps growing':
      'Ausblick: jenseits des dargestellten Bereichs wächst die Steigung weiter',
    'on all of ℝⁿ, f would be continuous but not uniformly continuous (the classic x² behaviour).':
      'auf ganz ℝⁿ wäre f stetig, aber nicht gleichmäßig stetig (das klassische x²-Verhalten).',
    'The class depends on the domain. Shrink ±R or add constraints and it can change: 1/x is not uniformly continuous on (0, R], but Lipschitz on [1, R].':
      'Die Klasse hängt vom Bereich ab. Ändere ±R oder füge Nebenbedingungen hinzu: 1/x ist auf (0, R] nicht gleichmäßig stetig, auf [1, R] aber Lipschitz-stetig.',
    '√|x| (kink)': '√|x| (Knick)', '1/x (pole)': '1/x (Pol)',

    /* total derivative (Functions lab) */
    'Total derivative  df': 'Totale Ableitung  df',
    'Totally differentiable at P means the remainder f(P+h) − f(P) − ∇f·h vanishes faster than |h|, in every direction at once. The analysis measures that remainder; the probe compares the directional derivative D_v f with the linear prediction ∇f·v.':
      'Total differenzierbar in P heißt: das Restglied f(P+h) − f(P) − ∇f·h verschwindet schneller als |h|, in allen Richtungen zugleich. Die Analyse misst dieses Restglied; die Sonde vergleicht die Richtungsableitung D_v f mit der linearen Vorhersage ∇f·v.',
    'Analyse total differentiability at P': 'Totale Differenzierbarkeit in P analysieren',
    'Show tangent plane at P': 'Tangentialebene in P anzeigen',
    'Show direction probe (slice along v)': 'Richtungssonde anzeigen (Schnitt entlang v)',
    'direction φ': 'Richtung φ',
    'v = (cos φ, sin φ)': 'v = (cos φ, sin φ)',
    'Total derivative (totales Differential)': 'Totale Ableitung (totales Differential)',
    'The linear map h ↦ f′(a)·h: its graph is the tangent line (= Taylor degree 1).':
      'Die lineare Abbildung h ↦ f′(a)·h: ihr Graph ist die Tangente (= Taylor-Grad 1).',
    'The linear map h ↦ ∇f·h: its graph is the tangent plane at P.':
      'Die lineare Abbildung h ↦ ∇f·h: ihr Graph ist die Tangentialebene in P.',
    'one-sided': 'einseitig',
    'remainder': 'Restglied',
    'The remainder vanishes: f is totally differentiable at P; near P, f(P+h) ≈ f(P) + ∇f·h.':
      'Das Restglied verschwindet: f ist in P total differenzierbar; nahe P gilt f(P+h) ≈ f(P) + ∇f·h.',
    'The remainder vanishes: F is totally differentiable at P; its total derivative is the Jacobian J above.':
      'Das Restglied verschwindet: F ist in P total differenzierbar; die totale Ableitung ist die Jacobi-Matrix J oben.',
    'The remainder does NOT vanish: f is not totally differentiable at P; even where all partial derivatives exist, ∇f fails to approximate f to first order.':
      'Das Restglied verschwindet NICHT: f ist in P nicht total differenzierbar; selbst wenn alle partiellen Ableitungen existieren, liefert ∇f keine Näherung erster Ordnung.',
    'The remainder does NOT vanish: F is not totally differentiable at P.':
      'Das Restglied verschwindet NICHT: F ist in P nicht total differenzierbar.',
    'worst direction': 'schlechteste Richtung',
    'test inconclusive: f is undefined arbitrarily close to P.':
      'Test nicht schlüssig: f ist beliebig nahe an P undefiniert.',
    'D_v f ≠ ∇f·v: the gradient does not predict this direction; f cannot be totally differentiable at P.':
      'D_v f ≠ ∇f·v: der Gradient sagt diese Richtung nicht voraus; f kann in P nicht total differenzierbar sein.',
    'D_v f = ∇f·v here: in this direction the linear approximation is exact to first order.':
      'Hier gilt D_v f = ∇f·v: in dieser Richtung stimmt die lineare Näherung in erster Ordnung.',
    'DF(P) = J: the Jacobian is the total derivative of a vector map, the linear map h ↦ J·h drawn as the deformed cube.':
      'DF(P) = J: die Jacobi-Matrix ist die totale Ableitung einer Vektorabbildung, die lineare Abbildung h ↦ J·h, gezeichnet als verformter Würfel.',
    'Submanifolds of ℝ³ and their geometry: parametric surfaces (curvature & fundamental forms), level sets g = c (isosurface + regular-value theorem), and curves (Frenet frame, curvature, torsion).':
      'Untermannigfaltigkeiten des ℝ³ und ihre Geometrie: parametrische Flächen (Krümmung & Fundamentalformen), Niveaumengen g = c (Isofläche + Satz vom regulären Wert) und Kurven (Frenet-Bein, Krümmung, Torsion).',
    'The 1-D time-independent Schrödinger equation −½ψ″ + V(x)ψ = Eψ (ℏ = m = 1), solved by diagonalising the finite-difference Hamiltonian. Type any potential V(x); read off the energy levels Eₙ and wavefunctions ψₙ, or launch a wave packet to see tunnelling and spreading.':
      'Die 1-D zeitunabhängige Schrödinger-Gleichung −½ψ″ + V(x)ψ = Eψ (ℏ = m = 1), gelöst durch Diagonalisieren des Finite-Differenzen-Hamiltonoperators. Gib ein beliebiges Potential V(x) ein; lies die Energieniveaus Eₙ und Wellenfunktionen ψₙ ab, oder starte ein Wellenpaket, um Tunneln und Zerfließen zu sehen.',
    'Separation of variables, live: the initial profile u₀(x) is projected ONCE onto the sine modes of [0, L] and every mode then evolves exactly: wave, heat, or free Schrödinger. Same modes, three different physics.':
      'Separation der Variablen, live: das Anfangsprofil u₀(x) wird EINMAL auf die Sinus-Moden von [0, L] projiziert, und jede Mode entwickelt sich dann exakt: Welle, Wärme oder freie Schrödinger. Gleiche Moden, drei verschiedene Physiken.',
    'Small oscillations (kleine Schwingungen): N masses and springs, written as M·ü = −K·u. The normal modes are the eigenvectors of (K − ω²M)φ = 0: each one oscillates at a single frequency, and every motion is a superposition of them.':
      'Kleine Schwingungen: N Massen und Federn, geschrieben als M·ü = −K·u. Die Normalmoden sind die Eigenvektoren von (K − ω²M)φ = 0: jede schwingt mit einer einzigen Frequenz, und jede Bewegung ist eine Überlagerung von ihnen.',
    'Scattering & cross-section (Streuung & Wirkungsquerschnitt): a parallel beam with impact parameter b hits a central potential V(r). The deflection function Θ(b) is computed from the exact classical scattering integral; its Jacobian gives the differential cross-section dσ/dΩ.':
      'Streuung & Wirkungsquerschnitt: ein paralleles Bündel mit Stoßparameter b trifft ein Zentralpotential V(r). Die Ablenkfunktion Θ(b) folgt aus dem exakten klassischen Streuintegral; ihre Jacobi-Determinante liefert den differentiellen Wirkungsquerschnitt dσ/dΩ.',

    /* common readout section labels */
    'construction': 'Konstruktion', 'annotated ray': 'beschrifteter Strahl',
    'closed loop': 'geschlossene Schleife', 'open path': 'offener Weg',

    /* play-toggle button labels */
    '❚❚ Pause boost': '❚❚ Boost anhalten', '▶ Animate boost': '▶ Boost animieren',
    '▶ Launch trajectory': '▶ Bahn starten', '▶ Animate convergence': '▶ Konvergenz animieren',
    '❚❚ Pause flow': '❚❚ Fluss anhalten', '▶ Play flow': '▶ Fluss abspielen',
    '▶ Evolve ψ(x,t)': '▶ ψ(x,t) entwickeln', '▶ Evolve u(x,t)': '▶ u(x,t) entwickeln',
    '▶ Fire the beam': '▶ Strahl abschießen', '❚❚ Pause bodies': '❚❚ Körper anhalten', '▶ Release bodies': '▶ Körper loslassen',

    /* preset names: Fields (vector) */
    'Uniform flow': 'Gleichförmige Strömung', 'Radial source': 'Radiale Quelle', 'Sink': 'Senke',
    'Rigid rotation (z)': 'Starre Rotation (z)', 'Simple shear': 'Einfache Scherung', 'Saddle (2D)': 'Sattel (2D)',
    'Irrotational vortex': 'Wirbelfreier Wirbel', 'Coulomb / gravity': 'Coulomb / Gravitation',
    'Conservative (gradient)': 'Konservativ (Gradient)', 'Helical flow': 'Schraubenströmung',
    'Confined rotation': 'Eingeschlossene Rotation', 'Traveling wave (t)': 'Laufende Welle (t)',
    /* preset names: Fields (scalar) */
    'Gaussian bump': 'Gauß-Berg', 'Paraboloid': 'Paraboloid', 'Harmonic saddle': 'Harmonischer Sattel',
    'Coulomb potential': 'Coulomb-Potential', 'Plane wave': 'Ebene Welle', 'l=2 spherical harmonic': 'l=2 Kugelflächenfunktion',
    'Ripple': 'Kräuselung', 'Product wave': 'Produktwelle', 'Dipole potential': 'Dipol-Potential',
    'Ball indicator χ': 'Kugel-Indikator χ', 'Spherical shell': 'Kugelschale', 'Standing wave (t)': 'Stehende Welle (t)',
    /* preset names: Matrix */
    'Identity': 'Identität', 'Non-uniform scale': 'Ungleiche Skalierung', 'Rotation 45° (z)': 'Rotation 45° (z)',
    'Shear (x←y)': 'Scherung (x←y)', 'Reflection (z)': 'Spiegelung (z)',
    /* preset names: Functions */
    'cubic': 'kubisch', 'sine': 'Sinus', 'gaussian': 'Gauß', 'damped wave': 'gedämpfte Welle', 'step': 'Stufe',
    'pulse': 'Puls', 'abs (piecewise)': 'Betrag (stückweise)', 'staircase': 'Treppe', 'saddle': 'Sattel',
    'ripple': 'Kräuselung', 'paraboloid': 'Paraboloid', 'monkey saddle': 'Affensattel', 'sombrero': 'Sombrero',
    'cone √(x²+y²)': 'Kegel √(x²+y²)', 'abs ridge |x|−|y|': 'Betragsgrat |x|−|y|', 'tanh step': 'tanh-Stufe',
    'disk mask': 'Scheiben-Maske', 'square mask': 'Quadrat-Maske', 'annulus': 'Kreisring', 'sphere': 'Kugel',
    'waves': 'Wellen', 'hyperboloid': 'Hyperboloid', 'rotation': 'Rotation', 'source': 'Quelle', 'shear': 'Scherung',
    'z² map': 'z²-Abbildung', 'swirl+sink': 'Wirbel+Senke',
    /* preset names: curves & manifolds */
    'circle': 'Kreis', 'ellipse': 'Ellipse', 'segment': 'Segment', 'helix': 'Helix', 'big loop': 'große Schleife',
    'torus': 'Torus', 'helicoid': 'Helikoid', 'catenoid': 'Katenoid', 'Möbius band': 'Möbiusband', 'ellipsoid': 'Ellipsoid',
    'two-sheet hyperboloid': 'zweischaliges Hyperboloid', 'cone (singular!)': 'Kegel (singulär!)', 'gyroid': 'Gyroid',
    'trefoil knot': 'Kleeblattknoten', 'twisted cubic': 'gewundene Kubik',
    /* preset names: Quantum / Waves / Modes / Scatter */
    'harmonic': 'harmonisch', 'infinite well': 'unendlicher Topf', 'finite well': 'endlicher Topf', 'double well': 'Doppeltopf',
    'tunnelling ▶': 'Tunneln ▶', 'free packet ▶': 'freies Paket ▶', 'beats ψ₀+ψ₁ ▶': 'Schwebung ψ₀+ψ₁ ▶',
    'pluck ▶': 'Zupfen ▶', 'bump ▶': 'Berg ▶', 'hammer ▶': 'Hammer ▶', 'pure mode': 'reine Mode',
    'heat: bump ▶': 'Wärme: Berg ▶', 'heat: slab ▶': 'Wärme: Platte ▶', 'ψ: same bump ▶': 'ψ: gleicher Berg ▶',
    'two pendula: beats ▶': 'zwei Pendel: Schwebung ▶', 'uniform chain': 'gleichmäßige Kette',
    'pluck the middle ▶': 'Mitte anzupfen ▶', 'diatomic chain': 'zweiatomige Kette', 'heavy impurity': 'schweres Fremdatom',
    'free ends: zero mode': 'freie Enden: Nullmode', 'attractive −1/r ▶': 'anziehend −1/r ▶', 'hard sphere': 'harte Kugel',
    'soft blob': 'weicher Klumpen',

    /* preset descriptions: Quantum */
    'Harmonic oscillator ½x². Equally-spaced levels Eₙ = n + ½ (ℏ=m=1).':
      'Harmonischer Oszillator ½x². Gleich beabstandete Niveaus Eₙ = n + ½ (ℏ=m=1).',
    'Particle in a box (hard walls at ±L). Eₙ ∝ n²; ψₙ are sine standing waves.':
      'Teilchen im Kasten (harte Wände bei ±L). Eₙ ∝ n²; ψₙ sind stehende Sinuswellen.',
    'Finite square well, depth 6, width 4. Only a few bound states; ψ leaks past the walls.':
      'Endlicher Rechtecktopf, Tiefe 6, Breite 4. Nur wenige gebundene Zustände; ψ leckt über die Wände hinaus.',
    'Two wells split by a barrier. Low levels come in near-degenerate tunnelling pairs (symmetric/antisymmetric).':
      'Zwei Töpfe, getrennt durch eine Barriere. Untere Niveaus treten als fast entartete Tunnelpaare auf (symmetrisch/antisymmetrisch).',
    'Morse potential (a real diatomic bond): levels get closer together toward dissociation.':
      'Morse-Potential (eine echte zweiatomige Bindung): die Niveaus rücken zur Dissoziation hin zusammen.',
    'Linear "quantum bouncer" well: anharmonic, unequal spacing.':
      'Lineares „Quanten-Springer“-Potential: anharmonisch, ungleiche Abstände.',
    'A barrier of height 3 but packet energy ⟨E⟩ ≈ 2.1; classically it must bounce, yet part of |ψ|² appears beyond the barrier: tunnelling.':
      'Eine Barriere der Höhe 3, aber Paketenergie ⟨E⟩ ≈ 2,1; klassisch müsste es abprallen, doch ein Teil von |ψ|² erscheint jenseits der Barriere: Tunneln.',
    'A free Gaussian packet moves at the group velocity k₀ and spreads as it travels: dispersion of a matter wave.':
      'Ein freies Gauß-Paket bewegt sich mit der Gruppengeschwindigkeit k₀ und zerfließt beim Laufen: Dispersion einer Materiewelle.',
    'An equal superposition of two eigenstates is NOT stationary: |ψ|² sloshes at the beat frequency ω = E₁ − E₀.':
      'Eine gleiche Überlagerung zweier Eigenzustände ist NICHT stationär: |ψ|² schwappt mit der Schwebungsfrequenz ω = E₁ − E₀.',

    /* preset descriptions: Waves */
    'A plucked string (triangle). Coefficients fall as 1/n²; the kink splits, travels, reflects at the walls and reassembles: d\'Alembert in action.':
      'Eine gezupfte Saite (Dreieck). Koeffizienten fallen wie 1/n²; der Knick teilt sich, läuft, reflektiert an den Wänden und setzt sich wieder zusammen: d’Alembert in Aktion.',
    'A Gaussian bump splits into two half-height waves running left and right: u = ½u₀(x−ct) + ½u₀(x+ct).':
      'Ein Gauß-Berg teilt sich in zwei halbhohe Wellen nach links und rechts: u = ½u₀(x−ct) + ½u₀(x+ct).',
    'A struck string (piano hammer): zero displacement but an initial VELOCITY kick. The energy starts purely kinetic.':
      'Eine angeschlagene Saite (Klavierhammer): keine Auslenkung, aber ein anfänglicher GESCHWINDIGKEITS-Stoß. Die Energie ist zu Beginn rein kinetisch.',
    'A single eigenmode is a standing wave: the shape never changes, only its amplitude oscillates at ω₃; this is what "mode" means.':
      'Eine einzelne Eigenmode ist eine stehende Welle: die Form ändert sich nie, nur ihre Amplitude schwingt mit ω₃; genau das bedeutet „Mode“.',
    'Diffusion: mode n dies at the rate Dkₙ². High harmonics vanish first, so the profile smooths, spreads, then fades as slow n = 1.':
      'Diffusion: Mode n zerfällt mit der Rate Dkₙ². Hohe Harmonische verschwinden zuerst, das Profil glättet und verbreitert sich und verblasst zuletzt als langsame n = 1.',
    'A hot slab. Sharp edges are made of high modes → they blur almost instantly; the n = 1 mode lingers longest. Watch the spectrum bars die top-down.':
      'Eine heiße Platte. Scharfe Kanten bestehen aus hohen Moden → sie verwischen fast sofort; die n = 1-Mode bleibt am längsten. Beobachte, wie die Spektralbalken von oben nach unten sterben.',
    'The SAME bump under Schrödinger: no mode ever decays (|cₙ| constant); instead the phases rotate at Eₙ ∝ n², so the shape scrambles without losing norm.':
      'Derselbe Berg unter Schrödinger: keine Mode zerfällt (|cₙ| konstant); stattdessen drehen die Phasen mit Eₙ ∝ n², sodass die Form zerläuft, ohne die Norm zu verlieren.',

    /* preset descriptions: Modes */
    'Two pendula, weakly coupled. Displace ONE: that is (φ₁+φ₂)/√2, and since ω₁ ≠ ω₂ the energy sloshes back and forth, beats with period 2π/Δω.':
      'Zwei schwach gekoppelte Pendel. Lenke EINES aus: das ist (φ₁+φ₂)/√2, und da ω₁ ≠ ω₂, pendelt die Energie hin und her, Schwebung mit Periode 2π/Δω.',
    'N equal masses. The mode shapes are sampled sine waves and ωₙ = 2√(k/m)·sin(nπ/(2N+2)). Check them against the dispersion view.':
      'N gleiche Massen. Die Modenformen sind abgetastete Sinuswellen und ωₙ = 2√(k/m)·sin(nπ/(2N+2)). Vergleiche sie mit der Dispersions-Ansicht.',
    'A single displaced mass is a superposition of ALL modes (see the spectrum). The bump radiates away: a wave packet of lattice waves.':
      'Eine einzelne ausgelenkte Masse ist eine Überlagerung ALLER Moden (siehe Spektrum). Der Buckel strahlt weg: ein Wellenpaket aus Gitterwellen.',
    'Alternating masses m, 3m split the spectrum into an acoustic and an optical branch with a BAND GAP between them: the crystal-lattice origin of phonon bands.':
      'Abwechselnde Massen m, 3m spalten das Spektrum in einen akustischen und einen optischen Zweig mit einer BANDLÜCKE dazwischen: der Kristallgitter-Ursprung der Phononenbänder.',
    'One mass is 5× heavier. Pluck it: the defect moves sluggishly and reshapes the local modes; defects change the spectrum.':
      'Eine Masse ist 5× schwerer. Zupfe sie an: der Defekt bewegt sich träge und formt die lokalen Moden um; Defekte verändern das Spektrum.',
    'No walls → translation costs no energy: ω₁ = 0, φ₁ = constant. Exciting it just displaces the whole chain, forever. Symmetry ⇒ zero mode.':
      'Keine Wände → Translation kostet keine Energie: ω₁ = 0, φ₁ = konstant. Ihre Anregung verschiebt einfach die ganze Kette, für immer. Symmetrie ⇒ Nullmode.',

    /* preset descriptions: Scatter */
    'Repulsive Coulomb: Θ = 2·atan(k/2Eb), dσ/dΩ = (k/4E)²/sin⁴(θ/2), the 1911 experiment that revealed the nucleus. Head-on rays bound its size: r₀ = k/E.':
      'Abstoßendes Coulomb: Θ = 2·atan(k/2Eb), dσ/dΩ = (k/4E)²/sin⁴(θ/2), das Experiment von 1911, das den Kern enthüllte. Frontal treffende Strahlen begrenzen seine Größe: r₀ = k/E.',
    'Same magnitude, opposite sign: rays bend TOWARD the centre and Θ(b) flips sign, yet dσ/dΩ comes out identical. Rutherford scattering cannot tell + from −.':
      'Gleicher Betrag, umgekehrtes Vorzeichen: Strahlen biegen ZUM Zentrum und Θ(b) wechselt das Vorzeichen, dennoch ergibt sich dasselbe dσ/dΩ. Rutherford-Streuung unterscheidet + nicht von −.',
    'A wall of height 50 ≫ E is an impenetrable sphere: θ = π − 2·asin(b/R), and dσ/dΩ = R²/4. ISOTROPIC. Total σ = πR², exactly the geometric shadow.':
      'Eine Wand der Höhe 50 ≫ E ist eine undurchdringliche Kugel: θ = π − 2·asin(b/R) und dσ/dΩ = R²/4. ISOTROP. Gesamt σ = πR², genau der geometrische Schatten.',
    'Screened Coulomb (a model of the nuclear force): Rutherford-like up close, but the exponential kills the long-range tail; large-b rays pass almost straight.':
      'Abgeschirmtes Coulomb (ein Modell der Kernkraft): nah wie Rutherford, aber die Exponentialfunktion tötet den langreichweitigen Schwanz; Strahlen mit großem b laufen fast gerade durch.',
    'Attractive outside, hard core inside. Θ(b) develops a MINIMUM → a spike in dσ/dΩ at that angle: rainbow scattering, the same mathematics as the optical rainbow.':
      'Außen anziehend, innen harter Kern. Θ(b) entwickelt ein MINIMUM → eine Spitze in dσ/dΩ bei diesem Winkel: Regenbogenstreuung, dieselbe Mathematik wie beim optischen Regenbogen.',
    'A smooth finite-range bump: only small-b rays deflect, there is a maximum scattering angle, and (unlike Coulomb) the total cross-section is finite.':
      'Ein glatter Buckel endlicher Reichweite: nur Strahlen mit kleinem b werden abgelenkt, es gibt einen maximalen Streuwinkel, und (anders als bei Coulomb) ist der totale Wirkungsquerschnitt endlich.',

    /* controls that were missing from the first pass (audit-driven) */
    'Generate a field': 'Feld erzeugen',
    'Conservative: F = ∇φ': 'Konservativ: F = ∇φ', 'Incompressible: F = ∇×A': 'Quellenfrei: F = ∇×A',
    'Laplace field: φ harmonic': 'Laplace-Feld: φ harmonisch', 'Uniform source: ∇·F = s': 'Gleichmäßige Quelle: ∇·F = s',
    'Uniform vorticity: ∇×F = Ω': 'Gleichmäßige Wirbelstärke: ∇×F = Ω', 'Confined eddy: stream ψ': 'Eingeschlossener Wirbel: Stromfunktion ψ',
    'Harmonic: ∇²f = 0': 'Harmonisch: ∇²f = 0', 'Eigenfunction: ∇²f = −k²f': 'Eigenfunktion: ∇²f = −k²f',
    'Localized bump / well': 'Lokalisierter Berg / Topf',
    'ABC Beltrami flow': 'ABC-Beltrami-Strömung',
    'Acceleration  a(x, v, t)': 'Beschleunigung  a(x, v, t)', 'use x, v, t': 'nutze x, v, t',
    'Analysis': 'Analyse', 'Initial condition': 'Anfangsbedingung', 'x range ±': 'x-Bereich ±', 'v range ±': 'v-Bereich ±',
    'animation speed': 'Animationsgeschwindigkeit', 'Range': 'Bereich', 'Range (half-span)': 'Bereich (Halbspanne)',
    'Curve': 'Kurve', 'Isosurface': 'Isofläche', 'Surface (coloured by Gaussian K)': 'Fläche (gefärbt nach Gauß-K)',
    'Tangent plane at point': 'Tangentialebene am Punkt', 'Normal vector': 'Normalenvektor',
    'Critical points (∇g = 0)': 'Kritische Punkte (∇g = 0)', '∇g normal field': '∇g-Normalenfeld',
    'Tangent plane at Q (P projected onto g = c)': 'Tangentialebene in Q (P auf g = c projiziert)',
    'Normal vector ∇g at Q': 'Normalenvektor ∇g in Q',
    'footpoint Q: P projected onto g = c (Newton along ∇g)': 'Fußpunkt Q: P auf g = c projiziert (Newton entlang ∇g)',
    'tangent plane at Q': 'Tangentialebene in Q',
    'T_Q M = ker dg(Q): the tangent plane consists of exactly the directions v with ∇g(Q)·v = 0; the total derivative dg sends them to 0, so first-order motion along them stays on the level set.':
      'T_Q M = ker dg(Q): Die Tangentialebene besteht genau aus den Richtungen v mit ∇g(Q)·v = 0; die totale Ableitung dg schickt sie auf 0, Bewegung entlang ihnen bleibt also in erster Ordnung auf der Niveaumenge.',
    '∇g ≈ 0 at the footpoint, a singular point: the level set has no well-defined tangent plane there (regular value theorem fails).':
      '∇g ≈ 0 im Fußpunkt, ein singulärer Punkt: Die Niveaumenge hat dort keine wohldefinierte Tangentialebene (der Satz vom regulären Wert greift nicht).',
    'No footpoint on g = c found near P. Move P closer to the surface.':
      'Kein Fußpunkt auf g = c in der Nähe von P gefunden. Bewege P näher an die Fläche.',
    'Frenet frame (T, N, B)': 'Frenet-Bein (T, N, B)', 'Point for readout': 'Punkt für die Auswertung',
    'level c': 'Niveau c', 'point t': 'Punkt t', 'point u': 'Punkt u', 'point v': 'Punkt v',
    'u from … to': 'u von … bis', 'v from … to': 'v von … bis',
    'Projection → xy': 'Projektion → xy',
    'Scenarios': 'Szenarien', 'Simultaneity': 'Gleichzeitigkeit', 'Time dilation': 'Zeitdilatation',
    'Length contraction': 'Längenkontraktion', 'Light cone': 'Lichtkegel', 'Velocity addition': 'Geschwindigkeitsaddition',
    'Twin paradox': 'Zwillingsparadoxon', 'Worldlines': 'Weltlinien', 'Events': 'Ereignisse',
    '0 = lab frame': '0 = Laborsystem', 'Reference-frame velocity  β': 'Bezugssystem-Geschwindigkeit  β',
    'clock': 'Uhr', 'home': 'zuhause', 'traveller': 'Reisender',
    'Defective (Jordan)': 'Defektiv (Jordan)', 'Nilpotent': 'Nilpotent', 'Symmetric': 'Symmetrisch',
    'Spiral (complex λ)': 'Spirale (komplexes λ)', 'Rotation generator Kz': 'Rotationsgenerator Kz',
    'Rotation 60° about (1,1,1)': 'Rotation 60° um (1,1,1)',
    'Function  f(x)': 'Funktion  f(x)', 'Series  S_N(x)': 'Reihe  S_N(x)', 'Transform  |F(k)|': 'Transformierte  |F(k)|',
    'Spectrum  √(aₙ²+bₙ²)': 'Spektrum  √(aₙ²+bₙ²)', 'Show individual harmonics': 'Einzelne Harmonische zeigen',
    'half-period L': 'Halbperiode L', 'window ±L': 'Fenster ±L', 'terms N': 'Terme N',
    'square': 'Rechteck', 'sawtooth': 'Sägezahn', 'triangle': 'Dreieck', 'rectified': 'gleichgerichtet',
    'gauss packet ▶': 'Gauß-Paket ▶', 'wide gauss ▶': 'breites Gauß ▶', 'box → sinc ▶': 'Kasten → sinc ▶',
    'pendulum': 'Pendel', 'damped pendulum': 'gedämpftes Pendel', 'driven pendulum': 'getriebenes Pendel',
    'damped SHO': 'gedämpfter Oszillator', 'anharmonic': 'anharmonisch', 'lissajous': 'Lissajous',
    'mass #': 'Masse #', 'rod': 'Stab',
    'acoustic top': 'akustische Obergrenze', 'optical bottom': 'optische Untergrenze',
    'R²/4 (isotropic)': 'R²/4 (isotrop)', 'θ = π (backscatter)': 'θ = π (Rückstreuung)', 'ray b = ': 'Strahl b = ',

    /* scatter readout / formulas */
    'impact parameter': 'Stoßparameter', 'scattering angle': 'Streuwinkel', 'cross-section': 'Wirkungsquerschnitt',
    'captured': 'eingefangen', '(spirals in)': '(spiralt hinein)', 'analytic': 'analytisch',
    'head-on closest approach r₀': 'frontale Minimaldistanz r₀', '0 (reaches the centre)': '0 (erreicht das Zentrum)',
    'beam ray(s) captured: they spiral into the centre': 'Strahl(en) eingefangen: sie spiralen ins Zentrum',
    'grid rays captured': 'Gitterstrahlen eingefangen', 'gaps = capture / orbiting': 'Lücken = Einfang / Orbiting',
    'Deflection function': 'Ablenkfunktion', 'Differential cross-section': 'Differentieller Wirkungsquerschnitt',
    'Scattering beam': 'Streustrahl', 'green = analytic': 'grün = analytisch', 'rays': 'Strahlen',
    'grey circle: V(r) = E': 'grauer Kreis: V(r) = E',
    'dots: computed from Θ(b) · spikes = rainbow angles (dθ/db = 0)': 'Punkte: aus Θ(b) berechnet · Spitzen = Regenbogenwinkel (dθ/db = 0)',
    'dσ/dΩ = (b/sin θ)·|db/dθ| is the <b>Jacobian of the map b → θ</b>: it counts how much beam area (2πb·db) lands in each solid angle (2π sinθ·dθ). No single trajectory carries a cross-section: only the family does.':
      'dσ/dΩ = (b/sin θ)·|db/dθ| ist die <b>Jacobi-Determinante der Abbildung b → θ</b>: sie zählt, wie viel Strahlfläche (2πb·db) in jedem Raumwinkel (2π sinθ·dθ) landet. Keine einzelne Bahn trägt einen Wirkungsquerschnitt: nur die Familie.',
    '1/r has infinite range: EVERY b deflects a little, so the classical total cross-section diverges; only dσ/dΩ is measurable. Rutherford fitted 1/sin⁴(θ/2) and used head-on rays to bound the nucleus: r₀ = k/E =':
      '1/r hat unendliche Reichweite: JEDES b wird ein wenig abgelenkt, der klassische totale Wirkungsquerschnitt divergiert also; nur dσ/dΩ ist messbar. Rutherford fittete 1/sin⁴(θ/2) und begrenzte mit frontalen Strahlen den Kern: r₀ = k/E =',
    'Raise E and watch r₀ shrink.': 'Erhöhe E und sieh r₀ schrumpfen.',
    'Isotropic dσ/dΩ = R²/4, so σ = ∫(R²/4)dΩ = πR²: the geometric shadow of the sphere. This is the ONLY case where the classical cross-section is just "the area you see".':
      'Isotropes dσ/dΩ = R²/4, also σ = ∫(R²/4)dΩ = πR²: der geometrische Schatten der Kugel. Das ist der EINZIGE Fall, in dem der klassische Wirkungsquerschnitt einfach „die sichtbare Fläche“ ist.',
    'Read the views together: the <b>beam</b> shows trajectories, <b>Θ(b)</b> is the deflection function they trace out, and <b>dσ/dΩ</b> is its Jacobian. A flat spot in Θ(b) (dθ/db = 0) → a rainbow spike in the cross-section.':
      'Lies die Ansichten zusammen: der <b>Strahl</b> zeigt Bahnen, <b>Θ(b)</b> ist die Ablenkfunktion, die sie nachzeichnen, und <b>dσ/dΩ</b> ist ihre Jacobi-Determinante. Eine flache Stelle in Θ(b) (dθ/db = 0) → eine Regenbogen-Spitze im Querschnitt.',
    'The blue tube b ± db in the beam view carries the beam-annulus area 2πb·db into the solid-angle ring 2π·sinθ·dθ: their ratio IS dσ/dΩ. Where the tube barely spreads (|dθ/db| small), the cross-section is large.':
      'Das blaue Rohr b ± db in der Strahl-Ansicht trägt die Ringfläche 2πb·db des Bündels in den Raumwinkelring 2π·sinθ·dθ: ihr Verhältnis IST dσ/dΩ. Wo sich das Rohr kaum aufweitet (|dθ/db| klein), ist der Querschnitt groß.',
    'dσ/dΩ undefined here (dθ/db ≈ 0: a rainbow extremum, or θ ≈ 0/π, or a neighbouring ray is captured).':
      'dσ/dΩ ist hier undefiniert (dθ/db ≈ 0: ein Regenbogen-Extremum, oder θ ≈ 0/π, oder ein Nachbarstrahl wird eingefangen).',

    /* modes readout */
    'Small oscillations': 'Kleine Schwingungen', 'Dispersion relation': 'Dispersionsrelation',
    'one dot per normal mode': 'ein Punkt pro Normalmode', 'modes': 'Moden', 'note the band gap': 'beachte die Bandlücke',
    'conserved': 'erhalten', 'Eigenfrequencies': 'Eigenfrequenzen', 'zero mode': 'Nullmode',
    '(free translation)': '(freie Translation)', 'more': 'weitere', 'Mass matrix': 'Massenmatrix', 'Stiffness matrix': 'Steifigkeitsmatrix',
    'Ansatz u = φ·e^(iωt) turns M·ü = −K·u into the generalized eigenvalue problem <b>(K − ω²M)φ = 0</b>, symmetrised as K̃ = M^(−1/2)·K·M^(−1/2) and diagonalised (same QL solver as the Schrödinger lab). Modes are M-orthonormal: φₘᵀMφₙ = δₘₙ.':
      'Der Ansatz u = φ·e^(iωt) macht aus M·ü = −K·u das verallgemeinerte Eigenwertproblem <b>(K − ω²M)φ = 0</b>, symmetrisiert als K̃ = M^(−1/2)·K·M^(−1/2) und diagonalisiert (derselbe QL-Löser wie im Schrödinger-Lab). Die Moden sind M-orthonormal: φₘᵀMφₙ = δₘₙ.',
    'Two modes share the energy': 'Zwei Moden teilen sich die Energie',
    'the motion <b>beats</b>: energy migrates back and forth with period': 'die Bewegung <b>schwebt</b>: Energie wandert hin und her mit der Periode',

    /* bodies readout */
    'bodies': 'Körper', 'escaped': 'entkommen', 'latest body': 'neuester Körper', 'spin': 'Drehung',
    'volume': 'Volumen', 'energy': 'Energie',
    'Set the point P above and drop a body, then release it and watch it ride the field.':
      'Setze oben den Punkt P und lass einen Körper fallen, dann lass ihn los und sieh zu, wie er auf dem Feld reitet.',
    'f is scalar → bodies follow the gradient flow ẋ = −∇f (steepest descent). Since ∇×∇f ≡ 0, they never spin.':
      'f ist skalar → Körper folgen dem Gradientenfluss ẋ = −∇f (steilster Abstieg). Wegen ∇×∇f ≡ 0 drehen sie sich nie.',
    'ẋ = F(x): the body rides the flow; it spins with ω = ½∇×F and its volume grows at rate ∇·F (Cauchy–Stokes). Try “Irrotational vortex”: bodies orbit, yet never spin.':
      'ẋ = F(x): der Körper reitet auf der Strömung; er dreht sich mit ω = ½∇×F und sein Volumen wächst mit der Rate ∇·F (Cauchy–Stokes). Probiere den „wirbelfreien Wirbel“: Körper kreisen, drehen sich aber nie.',
    'f acts as a potential: F = −∇f, so m·ẍ = −∇f. The total energy E = ½m|v|² + f is conserved. Watch it stay constant.':
      'f wirkt als Potential: F = −∇f, also m·ẍ = −∇f. Die Gesamtenergie E = ½m|v|² + f ist erhalten. Sieh zu, wie sie konstant bleibt.',
    'm·ẍ = F(x): Newton. A point mass does <b>not</b> spin: for a force field, ∇×F measures non-conservativity (∮F·dr ≠ 0), not rotation. Switch the reading to “velocity field” to see spin.':
      'm·ẍ = F(x): Newton. Ein Massenpunkt dreht sich <b>nicht</b>: bei einem Kraftfeld misst ∇×F Nicht-Konservativität (∮F·dr ≠ 0), keine Drehung. Wechsle die Deutung auf „Geschwindigkeitsfeld“, um Drehung zu sehen.',
    'F depends on t and the field clock is running: the bodies’ clock is locked to it.':
      'F hängt von t ab und die Feld-Uhr läuft: die Uhr der Körper ist an sie gekoppelt.',

    /* line-integral readout */
    'length': 'Länge',
    '≈ 0 around a closed loop → the work is path-independent here, so F looks <b>conservative</b> (F = ∇φ for a potential φ).':
      '≈ 0 entlang einer geschlossenen Schleife → die Arbeit ist hier wegunabhängig, F sieht also <b>konservativ</b> aus (F = ∇φ für ein Potential φ).',
    'Nonzero circulation around a closed loop ⇒ F is <b>not</b> conservative here (it has curl, no single-valued potential).':
      'Nichtverschwindende Zirkulation entlang einer geschlossenen Schleife ⇒ F ist hier <b>nicht</b> konservativ (es hat Rotation, kein eindeutiges Potential).',
    'Work of F from the start to the end of the path. Colour = F·T̂ (warm = with the field, blue = against).':
      'Arbeit von F vom Anfang bis zum Ende des Weges. Farbe = F·T̂ (warm = mit dem Feld, blau = dagegen).',

    /* quantum readout */
    'Energy levels (ℏ = m = 1)': 'Energieniveaus (ℏ = m = 1)', 'node': 'Knoten', 'nodes': 'Knoten',
    'is not stationary: their relative phase turns at': 'ist nicht stationär: ihre relative Phase dreht mit',
    'so |ψ|² sloshes with the beat period': 'daher schwappt |ψ|² mit der Schwebungsperiode',
    'A single eigenstate would sit still: quantum motion comes from energy <i>differences</i>.':
      'Ein einzelner Eigenzustand säße still: Quantenbewegung kommt aus Energie-<i>Differenzen</i>.',
    'The packet is a superposition of these eigenstates; each phase rotates at its own rate e^(−iEₙt), so |ψ|² moves. Small grey dots mark the <b>classical turning points</b> V = ⟨E⟩ =':
      'Das Paket ist eine Überlagerung dieser Eigenzustände; jede Phase dreht mit ihrer eigenen Rate e^(−iEₙt), also bewegt sich |ψ|². Kleine graue Punkte markieren die <b>klassischen Umkehrpunkte</b> V = ⟨E⟩ =',
    'density beyond a barrier top has <b>tunnelled</b>.': 'Dichte jenseits einer Barrierenspitze ist <b>getunnelt</b>.',
    'ψ is stacked on its energy level Eₙ (drag <b>States</b> to show more). Nodes increase with n: the quantum analogue of higher harmonics. Toggle |ψ|² to read the probability density.':
      'ψ ist auf seinem Energieniveau Eₙ gestapelt (ziehe <b>Zustände</b>, um mehr zu zeigen). Die Knoten nehmen mit n zu: das Quanten-Analogon höherer Harmonischer. Schalte |ψ|² um, um die Wahrscheinlichkeitsdichte abzulesen.',

    /* waves readout & formulas */
    'Heat equation &nbsp; u_t = D·u_xx &nbsp;·&nbsp; mode n decays as e^(−Dkₙ²t)': 'Wärmeleitungsgleichung &nbsp; u_t = D·u_xx &nbsp;·&nbsp; Mode n zerfällt wie e^(−Dkₙ²t)',
    'Free Schrödinger &nbsp; iψ_t = −½ψ_xx &nbsp;·&nbsp; cₙ(t) = aₙ e^(−iEₙt), Eₙ = kₙ²/2': 'Freie Schrödinger-Gleichung &nbsp; iψ_t = −½ψ_xx &nbsp;·&nbsp; cₙ(t) = aₙ e^(−iEₙt), Eₙ = kₙ²/2',
    'Wave equation &nbsp; u_tt = c²·u_xx &nbsp;·&nbsp; aₙcos(ωₙt) + (bₙ/ωₙ)sin(ωₙt), ωₙ = cnπ/L': 'Wellengleichung &nbsp; u_tt = c²·u_xx &nbsp;·&nbsp; aₙcos(ωₙt) + (bₙ/ωₙ)sin(ωₙt), ωₙ = cnπ/L',
    '|ψ|² magenta, Re ψ blue': '|ψ|² magenta, Re ψ blau',
    'Mode coefficients aₙ = (2/L)∫u₀ sin(nπx/L)dx': 'Modenkoeffizienten aₙ = (2/L)∫u₀ sin(nπx/L)dx',
    'Mode n decays as e^(−Dkₙ²t): the lifetime of n = 1 is': 'Mode n zerfällt wie e^(−Dkₙ²t): die Lebensdauer von n = 1 ist',
    'but': 'aber', 'dies': 'stirbt',
    '× faster (τ ∝ 1/n²). High harmonics carry the sharp edges: <b>that is why diffusion smooths</b>.':
      '× schneller (τ ∝ 1/n²). Hohe Harmonische tragen die scharfen Kanten: <b>deshalb glättet Diffusion</b>.',
    'Same modes, different physics: nothing decays; every |cₙ| is constant and ∫|ψ|² = const. Only the <i>phases</i> rotate, at Eₙ ∝ n² (nonlinear in n → dispersion). In a box the phases all realign at the revival time T = 4L²/π ≈':
      'Gleiche Moden, andere Physik: nichts zerfällt; jedes |cₙ| ist konstant und ∫|ψ|² = const. Nur die <i>Phasen</i> drehen, mit Eₙ ∝ n² (nichtlinear in n → Dispersion). Im Kasten richten sich alle Phasen zur Wiederkehr-Zeit T = 4L²/π ≈',
    'the packet reassembles!': 'das Paket setzt sich wieder zusammen!',
    'Each mode is a standing wave sin(nπx/L) whose amplitude oscillates at ωₙ = cnπ/L: all frequencies are integer multiples of ω₁ (that is why a string plays a <i>note</i>). Compare: switch the equation to <b>heat</b> or <b>Schrödinger</b> with the same u₀.':
      'Jede Mode ist eine stehende Welle sin(nπx/L), deren Amplitude mit ωₙ = cnπ/L schwingt: alle Frequenzen sind ganzzahlige Vielfache von ω₁ (deshalb spielt eine Saite einen <i>Ton</i>). Vergleiche: schalte die Gleichung auf <b>Wärme</b> oder <b>Schrödinger</b> mit demselben u₀ um.',

    /* Minkowski / Phase / Fourier lab notes + phase-space readout */
    'A Lorentz boost is a hyperbolic rotation: the pseudo-Euclidean sibling of the Matrix lab’s R = exp(θK). Time runs up (ct), space across (x), light at 45°. Drag the frame velocity β and watch the moving frame’s ct′, x′ axes scissor toward the light cone.':
      'Ein Lorentz-Boost ist eine hyperbolische Drehung: das pseudoeuklidische Geschwisterstück zu R = exp(θK) aus dem Matrix-Labor. Die Zeit läuft nach oben (ct), der Raum quer (x), Licht unter 45°. Zieh die Bezugssystem-Geschwindigkeit β und sieh zu, wie die Achsen ct′, x′ des bewegten Systems zum Lichtkegel hin scheren.',
    'A 1-degree-of-freedom system is a flow on the phase plane (x, v): ẋ = v, v̇ = a(x, v, t). Type the acceleration a using x, the velocity v and time t. Trajectories, fixed points and (for a conservative force) energy contours are drawn live.':
      'Ein System mit einem Freiheitsgrad ist ein Fluss in der Phasenebene (x, v): ẋ = v, v̇ = a(x, v, t). Tippe die Beschleunigung a mit x, der Geschwindigkeit v und der Zeit t. Bahnkurven, Fixpunkte und (bei konservativer Kraft) Energiekonturen werden live gezeichnet.',
    'Any periodic f is a sum of sines and cosines. Watch the partial sum S_N converge to f, the overshoot (Gibbs) at jumps, and the amplitude spectrum. Switch to the transform to see a wave packet and the Δx·Δk trade-off.':
      'Jedes periodische f ist eine Summe von Sinus- und Kosinusfunktionen. Sieh zu, wie die Partialsumme S_N gegen f konvergiert, das Überschwingen (Gibbs) an Sprüngen und das Amplitudenspektrum. Wechsle zur Transformation für ein Wellenpaket und den Kompromiss Δx·Δk.',
    'Fixed points  (v̇ = 0, v = 0)': 'Fixpunkte  (v̇ = 0, v = 0)',
    'none in view': 'keine im Bild',
    'center': 'Zentrum', 'stable spiral': 'stabile Spirale', 'unstable spiral': 'instabile Spirale',
    'stable node': 'stabiler Knoten', 'unstable node': 'instabiler Knoten',
    'Arrows show the flow (ẋ, v̇). <b>Centres</b> (green) are ringed by closed orbits; <b>saddles</b> (red) send the separatrix; <b>spirals/nodes</b> (blue = stable, orange = unstable) wind in or out. Set the yellow start point and press ▶: the magenta trail is the particle integrated live (RK4), so it is the true evolution even when the system is driven.':
      'Die Pfeile zeigen den Fluss (ẋ, v̇). <b>Zentren</b> (grün) sind von geschlossenen Bahnen umringt; von <b>Sätteln</b> (rot) geht die Separatrix aus; <b>Spiralen/Knoten</b> (blau = stabil, orange = instabil) winden sich hinein oder heraus. Setze den gelben Startpunkt und drücke ▶: die magentafarbene Spur ist das live integrierte Teilchen (RK4), also die echte Zeitentwicklung, auch bei getriebenen Systemen.',

    /* field-designer why/tryIt (the non-interpolated recipes) */
    'Because <b>∇×(∇φ) ≡ 0</b> is an identity, this field is conservative <i>by construction</i>: the property cannot fail.':
      'Weil <b>∇×(∇φ) ≡ 0</b> eine Identität ist, ist dieses Feld <i>durch Konstruktion</i> konservativ: die Eigenschaft kann nicht versagen.',
    'Operator → ∇×F is zero everywhere; a closed loop in the line-integral tool reports ∮F·dr ≈ 0; the work between two points is φ(end) − φ(start).':
      'Operator → ∇×F ist überall null; eine geschlossene Schleife im Linienintegral-Werkzeug meldet ∮F·dr ≈ 0; die Arbeit zwischen zwei Punkten ist φ(Ende) − φ(Anfang).',
    'Because <b>∇·(∇×A) ≡ 0</b> is an identity, this field is exactly incompressible, like a magnetic field, which always has a vector potential.':
      'Weil <b>∇·(∇×A) ≡ 0</b> eine Identität ist, ist dieses Feld exakt quellenfrei, wie ein Magnetfeld, das immer ein Vektorpotential besitzt.',
    'Operator → ∇·F is zero everywhere; drop a body (flow reading): it tumbles and stretches, but V/V₀ stays exactly 1.':
      'Operator → ∇·F ist überall null; lass einen Körper fallen (Strömungs-Deutung): er taumelt und dehnt sich, aber V/V₀ bleibt exakt 1.',
    'A harmonic potential gives <b>both</b> identities at once: ∇×F ≡ 0 (gradient) and ∇·F = ∇²φ ≡ 0 (harmonic). This is the field of electrostatics or gravity in empty space.':
      'Ein harmonisches Potential liefert <b>beide</b> Identitäten zugleich: ∇×F ≡ 0 (Gradient) und ∇·F = ∇²φ ≡ 0 (harmonisch). Das ist das Feld der Elektrostatik oder Gravitation im leeren Raum.',
    'Check ∇·F and ∇×F at any point P: both vanish. Dropped bodies keep their volume and never spin.':
      'Prüfe ∇·F und ∇×F an einem beliebigen Punkt P: beide verschwinden. Fallengelassene Körper behalten ihr Volumen und drehen sich nie.',
    'Every stream-function field is exactly divergence-free (∂x∂y ψ − ∂y∂x ψ ≡ 0), and the Gaussian confines it: a localized eddy. Field lines are the <b>level curves of ψ</b>: closed loops.':
      'Jedes Stromfunktions-Feld ist exakt divergenzfrei (∂x∂y ψ − ∂y∂x ψ ≡ 0), und die Gauß-Funktion schließt es ein: ein lokalisierter Wirbel. Feldlinien sind die <b>Niveaulinien von ψ</b>: geschlossene Schleifen.',
    'Turn on streamlines; drop one body inside the eddy and one far outside (it barely moves). V/V₀ stays exactly 1.':
      'Schalte Stromlinien ein; lass einen Körper im Wirbel und einen weit außerhalb fallen (er bewegt sich kaum). V/V₀ bleibt exakt 1.',
    'Built as a combination of harmonic basis functions (x·y, x²−y², x³−3xy², …): the Laplace equation is linear, so any combination stays harmonic.':
      'Gebaut als Kombination harmonischer Basisfunktionen (x·y, x²−y², x³−3xy², …): die Laplace-Gleichung ist linear, jede Kombination bleibt also harmonisch.',
    'Operator → ∇² shows zero everywhere; Operator → ∇f turns it into a Laplace vector field (curl- and divergence-free at once).':
      'Operator → ∇² zeigt überall null; Operator → ∇f macht daraus ein Laplace-Vektorfeld (zugleich rotations- und divergenzfrei).',
    'Each sine factor contributes −n² under ∂²: differentiating twice reproduces the SAME function, scaled by −k². These are the standing waves / particle-in-a-box modes.':
      'Jeder Sinusfaktor trägt −n² unter ∂² bei: zweimaliges Ableiten reproduziert DIESELBE Funktion, skaliert mit −k². Das sind die stehenden Wellen / Teilchen-im-Kasten-Moden.',
    'The exponential of a negative quadratic decays in every direction: the standard model of a localized bump.':
      'Die Exponentialfunktion eines negativen Quadrats fällt in jede Richtung ab: das Standardmodell eines lokalisierten Berges.',

    /* misc */
    'vectors:': 'Vektoren:',
    'Try:': 'Versuch:', 'in graph': 'im Graph',

    /* tab groups & new tab names */
    'Math': 'Mathematik', 'Physics': 'Physik',
    'Charges': 'Ladungen', 'Rigid body': 'Kreisel', 'Sequences': 'Folgen', 'Complex': 'Komplex',

    /* Charges lab */
    'Point charges with k = 1: E = Σ qᵢ r̂ᵢ/rᵢ², φ = Σ qᵢ/rᵢ, so Gauss’s law reads ∮E·dA = 4π·Q_enc. Place charges, watch field lines and equipotentials, and verify Gauss’s law with the movable sphere.':
      'Punktladungen mit k = 1: E = Σ qᵢ r̂ᵢ/rᵢ², φ = Σ qᵢ/rᵢ; das Gaußsche Gesetz lautet ∮E·dA = 4π·Q_ein. Setze Ladungen, betrachte Feldlinien und Äquipotentiallinien und prüfe das Gaußsche Gesetz mit der beweglichen Kugel.',
    'single charge': 'Einzelladung', 'dipole': 'Dipol', 'two equal charges': 'zwei gleiche Ladungen',
    'quadrupole': 'Quadrupol', 'row of 5 (plate)': 'Reihe aus 5 (Platte)',
    'Field arrows E': 'Feldpfeile E', 'Field lines': 'Feldlinien',
    'Equipotential curves (z = 0)': 'Äquipotentiallinien (z = 0)',
    'Equipotential surface φ = const': 'Äquipotentialfläche φ = const',
    'surface level (·q_max)': 'Flächen-Niveau (·q_max)',
    'Gauss sphere': 'Gauß-Kugel', 'Show the sphere & its flux': 'Kugel & ihren Fluss zeigen',
    'centre x': 'Zentrum x', 'centre y': 'Zentrum y', 'centre z': 'Zentrum z', 'radius': 'Radius',
    'Gauss sphere (green)': 'Gauß-Kugel (grün)', 'charge(s)': 'Ladung(en)',
    'no charges: add one in the panel': 'keine Ladungen: füge im Panel eine hinzu',
    'Gauss’s law, verified numerically: the flux counts exactly the enclosed charge; charges outside contribute zero net flux, wherever they sit.':
      'Gaußsches Gesetz, numerisch bestätigt: Der Fluss zählt genau die eingeschlossene Ladung; Ladungen außerhalb tragen netto nichts bei, egal wo sie sitzen.',
    'a charge sits almost ON the sphere: the numerical flux loses accuracy there.':
      'eine Ladung liegt fast AUF der Kugel: der numerische Fluss verliert dort an Genauigkeit.',
    'Move and resize the sphere: the flux jumps only when a charge crosses the surface.':
      'Verschiebe und skaliere die Kugel: Der Fluss springt nur, wenn eine Ladung die Fläche durchquert.',
    'Field lines start on positive (red) and end on negative (blue) charges; equipotential curves (z = 0 plane) cross them at right angles: E = −∇φ.':
      'Feldlinien starten auf positiven (rot) und enden auf negativen (blau) Ladungen; Äquipotentiallinien (Ebene z = 0) schneiden sie senkrecht: E = −∇φ.',

    /* Spin lab */
    'A spin-½ (qubit) lives on the Bloch sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩ with Bloch vector r = ⟨σ⟩. Under H = ½Ω·σ it precesses EXACTLY: ṙ = Ω × r (Larmor). Measuring collapses it onto ±â with P = (1 ± r·â)/2.':
      'Ein Spin-½ (Qubit) lebt auf der Bloch-Kugel: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩ mit Bloch-Vektor r = ⟨σ⟩. Unter H = ½Ω·σ präzediert er EXAKT: ṙ = Ω × r (Larmor). Eine Messung kollabiert ihn auf ±â mit P = (1 ± r·â)/2.',
    'State  |ψ⟩': 'Zustand  |ψ⟩', 'θ (polar)': 'θ (Polarwinkel)', 'φ (phase)': 'φ (Phase)',
    'Field  Ω (precession axis)': 'Feld  Ω (Präzessionsachse)',
    '▶ Precess': '▶ Präzedieren', 'Trail': 'Spur', 'Measure': 'Messen',
    'projective measurement: random outcome': 'projektive Messung: zufälliges Ergebnis',
    'amplitudes': 'Amplituden', 'measurement probabilities': 'Messwahrscheinlichkeiten', 'measured': 'gemessen',
    'the state collapsed onto the eigenstate and the phase memory is gone.':
      'der Zustand ist auf den Eigenzustand kollabiert: die Phaseninformation ist weg.',
    'The Bloch vector precesses about Ω at the Larmor frequency. Press ▶. A measurement is a jump, not a rotation: probabilities come from the projection (1 ± r·â)/2.':
      'Der Bloch-Vektor präzediert mit der Larmor-Frequenz um Ω. Drücke ▶. Eine Messung ist ein Sprung, keine Drehung: Die Wahrscheinlichkeiten kommen aus der Projektion (1 ± r·â)/2.',

    /* Atom lab */
    'The hydrogen eigenstates ψ_nlm: the exact solutions of −½∇²ψ − ψ/r = Eψ. Pick an orbital and see its probability cloud or its |ψ|² isosurface with the sign of ψ coloured (red +, blue −).':
      'Die Wasserstoff-Eigenzustände ψ_nlm: die exakten Lösungen von −½∇²ψ − ψ/r = Eψ. Wähle ein Orbital und sieh seine Wahrscheinlichkeitswolke oder die |ψ|²-Isofläche mit dem Vorzeichen von ψ (rot +, blau −).',
    'Orbital': 'Orbital', 'isosurface (sign-coloured)': 'Isofläche (vorzeichengefärbt)',
    'probability cloud |ψ|²': 'Wahrscheinlichkeitswolke |ψ|²', 'iso level': 'Iso-Niveau',
    'fraction of max |ψ|': 'Anteil von max |ψ|', 'Domain ±R (a₀)': 'Bereich ±R (a₀)',
    'radial nodes': 'radiale Knoten', 'angular nodes': 'Winkelknoten', 'nodes (radial + angular)': 'Knoten (radial + Winkel)',
    'Real orbitals (the chemist’s lobes): red / blue is the SIGN of ψ, the phase pattern that decides bonding. The energy depends only on n (hydrogen degeneracy); the shape carries l and m. Atomic units: lengths in a₀, energies in Hartree.':
      'Reelle Orbitale (die Keulen der Chemiker): Rot/Blau ist das VORZEICHEN von ψ, das Phasenmuster, das über Bindung entscheidet. Die Energie hängt nur von n ab (Wasserstoff-Entartung); die Form trägt l und m. Atomare Einheiten: Längen in a₀, Energien in Hartree.',
    'Isosurface view: a surface of constant |ψ|² (drag the level). Cloud view: |ψ|² sampled as points, the probability density itself.':
      'Isoflächen-Ansicht: eine Fläche konstanten |ψ|² (Niveau ziehen). Wolken-Ansicht: |ψ|² als Punkte, die Wahrscheinlichkeitsdichte selbst.',

    /* Rigid lab */
    'Build a rigid body from parts. The app assembles its inertia tensor (parallel-axis theorem), diagonalises it (the principal axes) and integrates Euler’s equations Iω̇ = (Iω)×ω in the principal frame. L stays constant in space; spinning near the MIDDLE principal axis is unstable (Dzhanibekov).':
      'Baue einen starren Körper aus Teilen. Die App stellt seinen Trägheitstensor auf (Satz von Steiner), diagonalisiert ihn (die Hauptachsen) und integriert die Eulerschen Gleichungen Iω̇ = (Iω)×ω im Hauptachsensystem. L bleibt raumfest; Rotation nahe der MITTLEREN Hauptachse ist instabil (Dschanibekow).',
    'Body': 'Körper', 'Shape': 'Form', '+ add part': '+ Teil hinzufügen', 'mass': 'Masse',
    'T-handle (Dzhanibekov)': 'T-Griff (Dschanibekow)', 'tennis racket': 'Tennisschläger', 'dumbbell': 'Hantel',
    'box': 'Quader', 'thin plate': 'dünne Platte', 'ring': 'Ring',
    'cylinder': 'Zylinder', 'ring (torus)': 'Ring (Torus)',
    'axis x': 'Achse x', 'axis y': 'Achse y', 'axis z': 'Achse z',
    'custom parts…': 'eigene Teile…', 'set moments directly': 'Momente direkt einstellen',
    'principal axes (e₁ cyan · e₂ orange · e₃ violet)': 'Hauptachsen (e₁ cyan · e₂ orange · e₃ violett)',
    'Spin axis': 'Drehachse', 'axis': 'Achse',
    'e₁: smallest I (stable)': 'e₁: kleinstes I (stabil)',
    'e₂: middle axis (unstable ▶)': 'e₂: mittlere Achse (instabil ▶)',
    'e₃: largest I (stable)': 'e₃: größtes I (stabil)',
    'custom axis…': 'eigene Achse…', 'n (body frame)': 'n (körperfest)',
    'direction: normalised automatically': 'Richtung: wird automatisch normiert',
    'Ω (spin rate)': 'Ω (Drehrate)', 'perturbation ε': 'Störung ε',
    'tiny off-axis seed: reveals (in)stability': 'winzige Störung quer zur Achse: zeigt die (In)Stabilität',
    'racket flip ▶': 'Schläger-Flip ▶',
    'no parts with mass: add one below.': 'keine Teile mit Masse: füge unten eines hinzu.',
    'principal moments': 'Hauptmomente', 'principal frame': 'Hauptachsensystem',
    'principal moments (about P)': 'Hauptmomente (um P)',
    'drawn about the centre of mass': 'gezeichnet um den Schwerpunkt',
    /* Rigid lab: placement of the body / rotation centre */
    'Rotation centre': 'Drehzentrum', 'centre of mass': 'Schwerpunkt', 'turns about': 'dreht um',
    'free: COM at the origin': 'frei: Schwerpunkt im Ursprung',
    'free: keep the built position': 'frei: gebaute Position beibehalten',
    'pinned at a pivot point…': 'in einem Punkt gelagert…',
    'a free body turns about its COM; a pinned one about the pivot (I is Steiner-shifted there)':
      'ein freier Körper dreht um seinen Schwerpunkt, ein gelagerter um den Lagerpunkt (I wird dorthin Steiner-verschoben)',
    'pivot P (built frame)': 'Lagerpunkt P (Baurahmen)',
    'the body is held at this point: put it off the COM and the COM orbits it':
      'der Körper wird in diesem Punkt festgehalten: abseits des Schwerpunkts kreist dieser darum',
    'mark the centre of mass': 'Schwerpunkt markieren',
    'ring on a pin ▶': 'Ring am Nagel ▶',
    'Pinned at the red dot: the holding force acts AT P, so it has no torque about P and L_P is still conserved; Euler’s equations hold with the Steiner-shifted tensor I_P = I_com + M(|d|²·1 − d dᵀ).':
      'Im roten Punkt gelagert: die Haltekraft greift IN P an, hat also kein Drehmoment um P; L_P bleibt erhalten, und die Eulerschen Gleichungen gelten mit dem Steiner-verschobenen Tensor I_P = I_S + M(|d|²·1 − d dᵀ).',
    'The white dot is the centre of mass. Watch it orbit the pivot.':
      'Der weiße Punkt ist der Schwerpunkt. Beobachte, wie er um das Lager kreist.',
    'Built coordinates kept: the body sits where you placed its parts and turns about its own centre of mass (white dot), which stays put: a free body feels no force. The principal moments do not depend on where you put it.':
      'Baukoordinaten beibehalten: der Körper sitzt dort, wo du seine Teile platziert hast, und dreht um seinen eigenen Schwerpunkt (weißer Punkt), der ruhen bleibt: auf einen freien Körper wirkt keine Kraft. Die Hauptmomente hängen nicht davon ab, wohin du ihn stellst.',
    'to keep your part positions instead, switch the rotation centre above.':
      'um stattdessen deine Teilpositionen beizubehalten, stelle oben das Drehzentrum um.',
    'Dzhanibekov ▶': 'Dschanibekow ▶',
    '▶ Spin': '▶ Drehen', 'Reset': 'Zurücksetzen',
    'Angular momentum L (space-fixed)': 'Drehimpuls L (raumfest)', 'Angular velocity ω': 'Winkelgeschwindigkeit ω',
    'Trail of ω (the wobble)': 'Spur von ω (das Torkeln)', 'drift': 'Drift', 'L drift (space)': 'L-Drift (Raum)',
    'const (space)': 'konstant (Raum)',
    'Rotation near a stable axis (largest or smallest moment): the wobble stays bounded.':
      'Rotation nahe einer stabilen Achse (größtes oder kleinstes Moment): das Torkeln bleibt beschränkt.',
    'Rotation near the MIDDLE axis, unstable (tennis-racket theorem): watch the Dzhanibekov flips. Energy and L are still conserved; only the orientation tumbles.':
      'Rotation nahe der MITTLEREN Achse, instabil (Tennisschläger-Theorem): beobachte die Dschanibekow-Überschläge. Energie und L bleiben erhalten; nur die Orientierung taumelt.',
    'Note: every real body satisfies I_k ≤ I_i + I_j (a flat plate saturates it); these moments are unphysical, so the drawn box is only indicative. The Euler dynamics still applies.':
      'Hinweis: Jeder reale Körper erfüllt I_k ≤ I_i + I_j (eine flache Platte saturiert die Ungleichung); diese Momente sind unphysikalisch, der gezeichnete Quader ist nur symbolisch. Die Euler-Dynamik gilt trotzdem.',
    'Principal axes: e₁ cyan (smallest I), e₂ orange (middle), e₃ violet (largest), the eigenvectors of the inertia tensor of YOUR body. Dashed gold: the body-fixed spin axis you chose. Watch it separate from the solid gold ω arrow as instability develops.':
      'Hauptachsen: e₁ cyan (kleinstes I), e₂ orange (mittleres), e₃ violett (größtes), die Eigenvektoren des Trägheitstensors DEINES Körpers. Gestrichelt gold: die gewählte körperfeste Drehachse. Beobachte, wie sie sich vom durchgezogenen goldenen ω-Pfeil löst, wenn die Instabilität einsetzt.',
    'Green = L, fixed in space (torque-free). Yellow = ω, which wanders: the magenta trail of its tip is the wobble.':
      'Grün = L, raumfest (kräftefrei). Gelb = ω, das wandert: die magentafarbene Spur seiner Spitze ist das Torkeln.',

    /* Kepler lab */
    'A planet (m = 1) under the central force F = −k r̂/r^p. For p = 2 the orbit is a closed conic and the Laplace–Runge–Lenz vector freezes the perihelion; nudge p away from 2 and the ellipse starts to precess. Bertrand’s theorem, live.':
      'Ein Planet (m = 1) unter der Zentralkraft F = −k r̂/r^p. Für p = 2 ist die Bahn ein geschlossener Kegelschnitt und der Laplace-Runge-Lenz-Vektor friert das Perihel ein; stelle p ungleich 2 und die Ellipse beginnt zu präzedieren. Bertrands Theorem, live.',
    'Force & start': 'Kraft & Start', 'strength k': 'Stärke k', 'exponent p': 'Exponent p',
    'p = 2: gravity': 'p = 2: Gravitation', 'start radius r₀': 'Startradius r₀',
    'start speed v₀ (tangential)': 'Startgeschwindigkeit v₀ (tangential)',
    'circular': 'Kreisbahn', 'near-parabolic': 'fast parabolisch', 'hyperbolic flyby': 'hyperbolischer Vorbeiflug',
    'precessing (p = 2.3) ▶': 'präzedierend (p = 2,3) ▶',
    '▶ Orbit': '▶ Umlaufen', 'orbit (x, y)': 'Bahn (x, y)', 'effective potential V_eff(r)': 'effektives Potential V_eff(r)',
    'perihelion advance': 'Periheldrehung',
    'Laplace–Runge–Lenz vector (magenta, points to the perihelion)':
      'Laplace-Runge-Lenz-Vektor (magenta, zeigt zum Perihel)',
    'Kepler’s laws: 1) an ellipse with the force centre in one focus (e = ':
      'Keplers Gesetze: 1) eine Ellipse mit dem Kraftzentrum in einem Brennpunkt (e = ',
    ', constant, equal areas in equal times; 3) T² = 4π²a³/k, here T = ':
      ', konstant, gleiche Flächen in gleichen Zeiten; 3) T² = 4π²a³/k, hier T = ',
    'E ≥ 0: an unbound orbit (parabola / hyperbola), the flyby of a comet.':
      'E ≥ 0: eine ungebundene Bahn (Parabel / Hyperbel), der Vorbeiflug eines Kometen.',
    'p ≠ 2: the LRL vector is NOT conserved; the perihelion precesses (rosette orbit). Only 1/r² and the harmonic force close every bound orbit (Bertrand’s theorem).':
      'p ≠ 2: der LRL-Vektor ist NICHT erhalten; das Perihel präzediert (Rosettenbahn). Nur 1/r² und die harmonische Kraft schließen jede gebundene Bahn (Satz von Bertrand).',
    'Kepler’s 2nd law holds for EVERY central force (it is conservation of L); the 1st and 3rd are special to 1/r². Switch to the V_eff view to read the turning points where E = V_eff.':
      'Keplers 2. Gesetz gilt für JEDE Zentralkraft (es ist die Erhaltung von L); das 1. und 3. sind Besonderheiten von 1/r². Wechsle zur V_eff-Ansicht, um die Umkehrpunkte mit E = V_eff abzulesen.',

    /* Chaos lab */
    'The double pendulum: two rods, four-dimensional phase space, and the simplest mechanical system with real chaos. Watch twin trajectories diverge and the Poincaré section dissolve from closed curves into dust.':
      'Das Doppelpendel: zwei Stäbe, vierdimensionaler Phasenraum und das einfachste mechanische System mit echtem Chaos. Sieh zu, wie Zwillingsbahnen auseinanderlaufen und der Poincaré-Schnitt von geschlossenen Kurven zu Staub zerfällt.',
    'Initial angles': 'Anfangswinkel', 'Twin trajectory (Δθ₁ = 0.001)': 'Zwillingsbahn (Δθ₁ = 0,001)',
    '▶ Swing': '▶ Schwingen', 'Poincaré section': 'Poincaré-Schnitt', 'double pendulum': 'Doppelpendel',
    'twin separation': 'Zwillingsabstand', 'section points': 'Schnittpunkte',
    'The magenta twin starts 0.001 rad away. In the chaotic regime the separation grows EXPONENTIALLY (positive Lyapunov exponent) until it saturates: deterministic, yet unpredictable.':
      'Der magentafarbene Zwilling startet 0,001 rad entfernt. Im chaotischen Bereich wächst der Abstand EXPONENTIELL (positiver Lyapunov-Exponent), bis er sättigt: deterministisch und doch unvorhersagbar.',
    'Poincaré section: every time pendulum 1 swings through the bottom upward, plot (θ₂, ω₂). Regular motion → closed curves; chaos → a dust that fills area. Energy stays conserved either way.':
      'Poincaré-Schnitt: Immer wenn Pendel 1 aufwärts durch die Senkrechte schwingt, wird (θ₂, ω₂) geplottet. Reguläre Bewegung → geschlossene Kurven; Chaos → Staub, der Fläche füllt. Die Energie bleibt in beiden Fällen erhalten.',
    'Small angles ⇒ two normal modes with ω² = (2 ∓ √2)·g/l: exactly the Modes lab. Chaos needs the full nonlinearity.':
      'Kleine Winkel ⇒ zwei Normalmoden mit ω² = (2 ∓ √2)·g/l: genau das Moden-Lab. Chaos braucht die volle Nichtlinearität.',

    /* Sequences lab */
    'Analysis 1, made visible: sequences and the ε–N game, series as partial sums, and function sequences with the ε-tube that separates pointwise from UNIFORM convergence. Write formulas with n (and x for fₙ).':
      'Analysis 1, sichtbar gemacht: Folgen und das ε-N-Spiel, Reihen als Partialsummen und Funktionenfolgen mit dem ε-Schlauch, der punktweise von GLEICHMÄSSIGER Konvergenz trennt. Schreibe Formeln mit n (und x für fₙ).',
    'sequence  aₙ': 'Folge  aₙ', 'series  Σ aₙ': 'Reihe  Σ aₙ', 'function sequence  fₙ(x)': 'Funktionenfolge  fₙ(x)',
    'use n': 'nutze n', 'use n and x': 'nutze n und x', 'limit L': 'Grenzwert L', 'limit f(x)': 'Grenzfunktion f(x)',
    'terms shown N': 'gezeigte Glieder N', 'interval [a, b]': 'Intervall [a, b]', 'invalid expression': 'ungültiger Ausdruck',
    'sin(n)/n': 'sin(n)/n', '(−1)^n (divergent)': '(−1)^n (divergent)',
    'Σ 1/n (harmonic, divergent)': 'Σ 1/n (harmonisch, divergent)',
    'x^n on [0,1]: not uniform': 'x^n auf [0,1]: nicht gleichmäßig',
    'sin(nx)/n: uniform': 'sin(nx)/n: gleichmäßig', 'x/n: uniform': 'x/n: gleichmäßig',
    'n·x·e^(−n·x²): not uniform': 'n·x·e^(−n·x²): nicht gleichmäßig',
    'at': 'bei',
    'The ε–N game, won: from N(ε) on, EVERY term stays inside (L−ε, L+ε). Convergence means: for every ε someone hands you, you can answer with such an N.':
      'Das ε-N-Spiel, gewonnen: Ab N(ε) bleibt JEDES Glied in (L−ε, L+ε). Konvergenz heißt: Zu jedem ε, das dir jemand gibt, kannst du mit einem solchen N antworten.',
    'Within the computed horizon the tail keeps escaping the ε-band: no convergence to this L (shrink ε only if you can still answer with an N!).':
      'Im berechneten Horizont verlässt der Schwanz das ε-Band immer wieder: keine Konvergenz gegen dieses L (verkleinere ε nur, wenn du noch mit einem N antworten kannst!).',
    'Enter a limit L to play the ε–N game.': 'Gib einen Grenzwert L ein, um das ε-N-Spiel zu spielen.',
    'Series are sequences of partial sums: same game, played on sₙ. The harmonic series creeps beyond every bound: divergence can be slow.':
      'Reihen sind Folgen von Partialsummen: dasselbe Spiel, gespielt mit sₙ. Die harmonische Reihe kriecht über jede Schranke: Divergenz kann langsam sein.',
    'The WHOLE graph of fₙ lies inside the ε-tube around f. That is uniform convergence: one n works for every x at once.':
      'Der GESAMTE Graph von fₙ liegt im ε-Schlauch um f. Das ist gleichmäßige Konvergenz: EIN n funktioniert für alle x zugleich.',
    'sup‖fₙ − f‖ is still shrinking. Raise n and the graph will enter the tube (uniform convergence).':
      'sup‖fₙ − f‖ schrumpft noch. Erhöhe n und der Graph rutscht in den Schlauch (gleichmäßige Konvergenz).',
    'sup‖fₙ − f‖ does NOT shrink: fₙ → f pointwise, but a bump always escapes the tube, the classic x^n picture. Pointwise ≠ uniform.':
      'sup‖fₙ − f‖ schrumpft NICHT: fₙ → f punktweise, aber ein Buckel entkommt dem Schlauch immer, das klassische x^n-Bild. Punktweise ≠ gleichmäßig.',
    'Uniform convergence is what lets you swap limits with integrals and continuity; pointwise alone does not.':
      'Gleichmäßige Konvergenz erlaubt das Vertauschen von Limes mit Integral und Stetigkeit; punktweise allein nicht.',

    /* Complex lab */
    'Complex functions seen whole: DOMAIN COLOURING paints each z with the hue of arg f(z) (zeros dark, poles bright), and the GRID IMAGE shows conformality: a holomorphic map bends the grid but keeps every angle right.':
      'Komplexe Funktionen als Ganzes: DOMAIN COLOURING färbt jedes z mit dem Farbton von arg f(z) (Nullstellen dunkel, Pole hell), und das GITTERBILD zeigt Konformität: eine holomorphe Abbildung verbiegt das Gitter, erhält aber jeden Winkel.',
    'Function': 'Funktion', 'custom map  u(x,y), v(x,y)': 'eigene Abbildung  u(x,y), v(x,y)',
    'domain colouring (input plane)': 'Domain Colouring (Eingangsebene)', 'grid image (output plane)': 'Gitterbild (Bildebene)',
    'grid lines': 'Gitterlinien', 'input square ±': 'Eingangsquadrat ±',
    'Cauchy–Riemann at a sample point': 'Cauchy-Riemann an einem Testpunkt',
    'Cauchy–Riemann holds; f is holomorphic here: the Jacobian is a rotation·scaling (det J = |f′|²), so angles are preserved. That is why the image grid stays orthogonal.':
      'Cauchy-Riemann erfüllt; f ist hier holomorph: Die Jacobi-Matrix ist Drehung·Streckung (det J = |f′|²), Winkel bleiben erhalten. Deshalb bleibt das Bildgitter rechtwinklig.',
    'Cauchy–Riemann fails; this map is ℝ² → ℝ² but not holomorphic: angles get distorted, the image grid loses its right angles.':
      'Cauchy-Riemann verletzt; diese Abbildung ist ℝ² → ℝ², aber nicht holomorph: Winkel werden verzerrt, das Bildgitter verliert seine rechten Winkel.',
    'Domain colouring: every zero is a dark point where all hues meet once per order; poles are bright. Try 1/z (pole), z²−1 (two zeros), z+1/z (the Joukowski map).':
      'Domain Colouring: Jede Nullstelle ist ein dunkler Punkt, an dem alle Farbtöne zusammenlaufen (einmal pro Ordnung); Pole sind hell. Probiere 1/z (Pol), z²−1 (zwei Nullstellen), z+1/z (Joukowski-Abbildung).',
    'hue = arg f · dark = zeros · bright = poles · bands double |f|':
      'Farbton = arg f · dunkel = Nullstellen · hell = Pole · Bänder verdoppeln |f|',
    'the image of the input grid under w = f(z), orthogonal wherever f is conformal':
      'das Bild des Eingangsgitters unter w = f(z), rechtwinklig, wo f konform ist'
  };

  function t(s) {
    if (lang === 'de') { var v = DE[s]; if (v != null) return v; }
    return s;
  }
  function getLang() { return lang; }
  function setLang(l) {
    lang = (l === 'de') ? 'de' : 'en';
    try { localStorage.setItem('vf-lang', lang); } catch (e) {}
  }
  function helpDE() { return HELP_DE; }

  /* --- German help manual (mirrors the English one in index.html) ---------- */
  var HELP_DE = [
    '<h3>Felder</h3>',
    '<p>Gib eine Formel für ein <b>Vektorfeld</b> <code>F = (Fx, Fy, Fz)</code> oder ein <b>Skalarfeld</b> <code>f</code> ein. ',
    'Wähle einen <b>Operator</b>, um Gradient, Divergenz, Rotation (curl) oder den Laplace-Operator live zu sehen.</p>',
    '<p>Um <b>Kreise oder geometrische Struktur</b> zu erkennen, erhöhe <b>Pfeilgitter N</b> oder setze <b>Pfeil-Anordnung → Ebene</b> ',
    'für einen dichten 2-D-Schnitt; <b>Stromlinien</b> zeichnen die Feldlinien direkt.</p>',
    '<p><b>Werte an einem Punkt:</b> bewege den Punkt <b>P</b> (magenta Marker), die Auswertung zeigt die tatsächlichen Zahlen hinter dem Graphen: ',
    '<code>∇·F</code>, <code>∇×F</code>, <code>∇²F</code> (bzw. <code>∇f</code>, <code>∇²f</code> für ein Skalarfeld) bei P.</p>',
    '<p><b>Linienintegral ∮F·dr:</b> aktivieren, eine Kurve <code>r(t)</code> und einen t-Bereich angeben; die App berechnet die Arbeit des Feldes ',
    'entlang des Weges, färbt die Kurve nach <code>F·T̂</code> und animiert einen Laufpunkt. Bei einer <b>geschlossenen Schleife</b> ',
    'meldet sie, ob die Zirkulation ≈ 0 ist, ein Hinweis, dass <b>F konservativ</b> ist (Potential φ mit F = ∇φ).</p>',
    '<p><b>Körper ins Feld fallen lassen:</b> P setzen, einen würfelförmigen Körper fallen lassen und <b>loslassen</b>. Dieselben Pfeile bedeuten ',
    'je nach <b>Deutung von F</b> verschiedene Physik:</p>',
    '<ul>',
    '<li><b>Geschwindigkeitsfeld (Strömung):</b> der Körper wird advehiert, <code>ẋ = F(x)</code>, und dreht sich (Cauchy–Stokes) ',
    'mit <b>ω = ½∇×F</b>, sein Volumen ändert sich mit der Rate <code>∇·F</code>, und mit <i>Verformen</i> trägt er den vollen ',
    'Deformationsgradienten <code>Ȧ = (∇F)A</code>. Probiere <b>starre Rotation</b> (kreist <i>und</i> dreht sich) und den ',
    '<b>wirbelfreien Wirbel</b>: Körper umkreisen die Achse, drehen sich aber <i>nie</i> (∇×F = 0), die klassische Paddelrad-Überraschung.</li>',
    '<li><b>Kraftfeld (Newton):</b> <code>m·ẍ = F(x)</code> mit Masse und Startgeschwindigkeit <code>v₀</code>. Ein Massenpunkt dreht sich ',
    '<b>nicht</b>: die Rotation eines <i>Kraft</i>-Feldes misst Nicht-Konservativität, keine Drehung. Bei einem <b>Skalarfeld</b> spürt der Körper ',
    '<code>F = −∇f</code> (f als potentielle Energie) und die Auswertung zeigt, dass <code>E = ½m|v|² + f</code> konstant bleibt.</li>',
    '</ul>',
    '<p>Hängt das Feld von <code>t</code> ab, ist die Uhr der Körper an die Feld-Uhr gekoppelt. Körper, die den 3-fachen Bereich verlassen, verblassen und stoppen.</p>',
    '<p><b>Feld-Designer:</b> wähle eine Eigenschaft und drücke <b>🎲 Erzeugen</b>; die App konstruiert ein zufälliges Feld, für das die Eigenschaft ',
    '<i>als mathematische Identität</i> gilt (aus einem Potential konstruiert, nicht geprüft). Konservativ: <code>F = ∇φ</code> (∇×F ≡ 0); ',
    'quellenfrei: <code>F = ∇×A</code> (∇·F ≡ 0); Laplace-Feld aus harmonischem Potential (beides zugleich); gleichmäßige Quelle/Wirbelstärke ',
    'mit vorgegebenem konstantem ∇·F bzw. ∇×F; und der eingeschlossene Wirbel aus einer Stromfunktion ψ. Für Skalarfelder: harmonische Funktionen, ',
    'Laplace-Eigenfunktionen (<code>∇²f = −k²f</code>) und lokalisierte Gauß-Berge. Jedes Feld kommt mit einer Begründung und einem Vorschlag zum Ausprobieren.</p>',

    '<h3>Variablen &amp; Syntax</h3>',
    '<ul>',
    '<li>Koordinaten: <code>x</code>, <code>y</code>, <code>z</code> und Zeit <code>t</code>.</li>',
    '<li>Abkürzungen: <code>r</code>=√(x²+y²+z²), <code>rho</code>=√(x²+y²), <code>phi</code>, <code>theta</code>, <code>r2</code>=x²+y²+z².</li>',
    '<li>Konstanten: <code>pi</code>, <code>tau</code>, <code>e</code>. Potenz ist <code>^</code>. Implizite Produkte: <code>2x</code>, <code>3sin(x)</code>.</li>',
    '<li>Außerdem: <b>Betrag</b> <code>|x| − |y|</code>, <b>Hochzahlen</b> <code>x²</code> = <code>x^2</code>, und ',
    'aneinandergereihte Koordinaten <code>xyz</code> = <code>x·y·z</code> (eine Hochzahl bindet an den letzten Buchstaben: <code>xy²</code> = <code>x·y²</code>).</li>',
    '<li>Funktionen: <code>sin cos tan asin acos atan atan2 sinh cosh tanh exp ln log10 log2 sqrt cbrt abs sign floor ceil round min max mod clamp step smoothstep hypot gauss sinc</code>.</li>',
    '</ul>',
    '<h3>Vergleiche &amp; Bereiche</h3>',
    '<p>Die Vergleiche <code>&lt;</code> <code>&lt;=</code> <code>&gt;</code> <code>&gt;=</code> <code>==</code> <code>!=</code> gehören zur Grammatik und ',
    'liefern <b>1 / 0</b>, so lassen sich Indikatorfunktionen und Bereiche zeichnen: <code>x^2+y^2 &lt; 1</code> (Scheibe), verkettet ',
    '<code>1 &lt; x^2+y^2 &lt; 4</code> (Kreisring) oder ein Feld maskieren: <code>-y*(rho&lt;2)</code>. Verknüpfe mit <code>*</code> (UND), ',
    '<code>max</code> (ODER), <code>1-</code> (NICHT).</p>',
    '<p><b>Echte Fallunterscheidungen:</b> <code>if(Bedingung, a, b)</code> oder <code>cases(B₁, W₁, …, sonst)</code>; nur der ',
    '<b>aktive Zweig</b> wird ausgewertet, daher ist <code>if(||x,y|| != 0, x*y/||x,y||, 0)</code> im Ursprung exakt 0 (kein 0/0); ',
    'Ableitungen werden zweigweise gebildet. <b>Normen:</b> <code>||a, b, …||</code> ist die aktuelle Norm (standardmäßig euklidisch; ',
    'im Funktionen-Labor umschaltbar auf 1-Norm, Maximumsnorm, p-Norm). Feste Varianten: <code>norm(…)</code>, <code>norm1(…)</code>, ',
    '<code>norminf(…)</code>, <code>normp(p, …)</code>.</p>',
    '<h3>Operatoren</h3>',
    '<p><code>∇f</code> Gradient (Skalar → Vektor) · <code>∇·F</code> Divergenz (Vektor → Skalar) · <code>∇×F</code> Rotation ',
    '(Vektor → Vektor) · <code>∇²</code> Laplace · <code>|F|</code> Betrag. Alle per zentraler Finite-Differenzen berechnet, so dass jede Formel funktioniert.</p>',

    '<h3>Matrix</h3>',
    '<p>Eine 3×3-Matrix <code>A</code> wirkt auf den Raum. Sieh den <b>verformten Würfel</b>, die <b>Basisvektoren</b> und ihre Bilder ',
    '(die <i>Spalten</i> von A), die <b>Eigenvektoren</b> und den animierten <b>Fluss</b> <code>x(t) = exp(tA)·x₀</code>. Die Auswertung gibt ',
    'Determinante, Spur, Rang, die volle Eigenzerlegung (reell und komplex), die Inverse <code>A⁻¹</code> und die Matrixexponentialfunktion <code>exp(A)</code>.</p>',

    '<h3>Funktionen</h3>',
    '<p>Wähle einen <b>Typ</b>; das Panel zeigt nur die passenden Regler.</p>',
    '<ul>',
    '<li><b>Skalar</b> <code>f(x)</code> / <code>f(x,y)</code> / <code>f(x,y,z)</code> → Kurve / Fläche (Höhe = Wert) / gefärbtes Volumen. ',
    'Wähle einen <b>Taylor-Grad</b> und ziehe den <b>Entwicklungspunkt</b>: die Taylor-Näherung (orange) schmiegt sich nahe am Punkt an. ',
    'Auswertung: exakter <b>Wert, Gradient, Jacobi (= ∇fᵀ), Hesse-Matrix</b> und das <b>Taylor-Polynom</b>.</li>',
    '<li><b>Vektor</b> <code>F(x,y,z)</code> → ein Vektorfeld, dessen <b>Jacobi-Matrix eine volle 3×3-Matrix</b> ist. Die Auswertung gibt ',
    '<b>det J</b>, <b>∇·F = Spur J</b> und <b>∇×F</b> (aus dem antisymmetrischen Teil).</li>',
    '</ul>',
    '<p><b>Totale Ableitung.</b> Der Abschnitt unter Taylor behandelt <code>df = ∇f·h</code> als das, was es ist: eine lineare ',
    'Abbildung. Zeige ihren Graphen als <b>Tangentialebene</b> in P und schalte die <b>Analyse</b> ein: das Restglied ',
    '<code>f(P+hv) − f(P) − h∇f·v</code> geteilt durch <code>h</code> wird für schrumpfende <code>h</code> in allen Richtungen ',
    'gemessen; es muss verschwinden, in allen Richtungen zugleich. Die <b>Richtungssonde</b> schneidet die Fläche entlang eines ',
    'gewählten <code>v</code> und vergleicht die echte einseitige Steigung <code>D_v f</code> mit der Vorhersage <code>∇f·v</code>. ',
    'Probiere das Preset <code>xy/‖(x,y)‖ bei 0</code> mit P im Ursprung: alle partiellen Ableitungen existieren, doch das ',
    'Restglied bleibt entlang der Diagonale bei ½ hängen: partielle Ableitungen allein bedeuten <i>keine</i> totale ',
    'Differenzierbarkeit. Für Vektorabbildungen ist die Jacobi-Matrix die totale Ableitung; derselbe Restglied-Test gilt für <code>F</code>.</p>',
    '<p><b>Nebenbedingungen &amp; Extrema.</b> Jede Zeile der Liste ist eine Nebenbedingung; mehrere Zeilen gelten ',
    'gleichzeitig (UND). Eine <b>Ungleichung</b> wie <code>x^2+y^2 &lt;= 4</code> oder <code>2 &lt; x^2+y^2 &lt; 9</code> ',
    'beschneidet den Graphen sauber auf ihren Gültigkeitsbereich (die Randzellen werden exakt an der Grenze zugeschnitten); ',
    'eine <b>Gleichung</b> wie <code>x^2+y^2 = 4</code> zeichnet die Zwangskurve auf die Fläche. Jeder Rand erscheint rot, ',
    'und darauf werden die <b>Lagrange-Kandidaten</b> gelb markiert: die Punkte mit <code>∇f = λ·∇g</code> ',
    '(Vorzeichenwechsel von <code>∇f × ∇g</code> entlang der Kurve). Die Auswertung listet jeden Kandidaten mit f, λ und ',
    'Max/Min-Einordnung. Probiere <i>Sattel + Kreis g = 4</i>: f = x²−y² auf x²+y² = 4 hat Maxima f = 4 bei (±2, 0) mit ',
    'λ = 1 und Minima f = −4 bei (0, ±2) mit λ = −1; <i>Paraboloid auf Kreisscheibe</i> zeigt den Ungleichungs-Fall. ',
    'Für <code>f(x,y,z)</code> ist die Nebenbedingungsmenge eine <b>Fläche</b>: Sie wird gezeichnet (Marching-Tetrahedra) und ',
    '<b>nach f eingefärbt</b>: die Extrema unter der Nebenbedingung erscheinen als heißeste und kälteste Stellen; die ',
    'Kandidaten kommen per Newton auf <code>∇f = λ·∇g, g = c</code> und tragen ∇f ∥ ∇g-Pfeile. Probiere ',
    '<i>Ebene auf Sphäre r = 3</i>: max f = 9 bei (2,−1,−2) mit λ = ½.</p>',
    '<p><b>Stetigkeit.</b> Der Stetigkeits-Abschnitt klassifiziert f auf dem dargestellten Bereich in ',
    '<code>Lipschitz ⊂ gleichmäßig stetig ⊂ stetig</code>, jeweils mit Begründung: verdächtige Sprungstellen werden per ',
    'Bisektion verfeinert (eine Lücke, die jede Verfeinerung überlebt, ist ein <b>Sprung</b>; explodierende Werte ein ',
    '<b>Pol</b>), und die Lipschitz-Schranke <code>L = sup ‖∇f‖</code> wird durch Hineinzoomen an der steilsten Stelle ',
    'geprüft: stabilisiert sie sich, liefert der Mittelwertsatz <code>|f(x)−f(y)| ≤ L|x−y|</code>; wächst sie weiter ',
    '(probiere <code>sqrt(|x|)</code>), existiert kein L, doch Heine–Cantor sichert auf dem kompakten Bereich weiterhin ',
    'gleichmäßige Stetigkeit. Die Klasse hängt vom Bereich ab: <code>1/x</code> ist auf <code>(0, R]</code> nicht ',
    'gleichmäßig stetig, wird mit der Nebenbedingung <code>x &gt;= 1</code> aber Lipschitz-stetig; bei <code>x²</code> warnt ',
    'ein Ausblick, dass die Steigung jenseits des Bereichs weiter wächst: auf ganz ℝ wäre f nicht gleichmäßig stetig.</p>',
    '<p>Alle Ableitungen und Taylor-Terme stammen aus <i>automatischer Differentiation</i>; nicht-glatte Ausdrücke fallen auf Finite-Differenzen zurück.</p>',

    '<h3>Mannigfaltigkeiten</h3>',
    '<p>Untermannigfaltigkeiten des ℝ³ und ihre Differentialgeometrie. Wähle eine <b>Art</b>:</p>',
    '<ul>',
    '<li><b>Parametrische Fläche</b> <code>φ(u,v)</code> → ein Netz, gefärbt nach <b>Gauß-Krümmung K</b> (elliptische vs. hyperbolische Bereiche), ',
    'mit Fundamentalformen, mittlerer/Haupt-Krümmung, Fläche und Euler-χ über Gauß–Bonnet.</li>',
    '<li><b>Niveaumenge</b> <code>g(x,y,z) = c</code> → Isofläche (Marching-Tetrahedra), ∇g-Normalen, kritische Punkte, Satz vom regulären Wert. Tangentialebene: P wird per Newton auf die Fläche projiziert (Fußpunkt Q), dort gilt T<sub>Q</sub>M = ker dg(Q) = ∇g(Q)<sup>⊥</sup>.</li>',
    '<li><b>Kurve</b> <code>r(t)</code> → Frenet-Bein, Krümmung κ, Torsion τ.</li>',
    '</ul>',

    '<h3>Minkowski (Raumzeit)</h3>',
    '<p>Das flache 1+1-Raumzeit-Diagramm. Ein Lorentz-Boost ist eine <b>hyperbolische Drehung</b> <code>Λ = exp(φK)</code>, die ',
    's² = (ct)² − x² erhält: das Geschwindigkeits-Geschwister des Matrix-Labs. Ziehe <b>β</b>, um das gestrichene Bezugssystem zu boosten; ',
    'Lichtlinien bleiben bei 45°. Szenarien: Gleichzeitigkeit, Zeitdilatation, Längenkontraktion, Lichtkegel, Geschwindigkeitsaddition, Zwillingsparadoxon.</p>',

    '<h3>Quantum (Schrödinger 1-D)</h3>',
    '<p>Die zeitunabhängige Schrödinger-Gleichung <code>−½ψ″ + V(x)ψ = Eψ</code> (ℏ = m = 1), gelöst durch Diagonalisieren des ',
    'Hamiltonoperators. Gib ein Potential <code>V(x)</code> ein und lies Energieniveaus und Wellenfunktionen ab. Ein <b>Wellenpaket</b> ',
    'zeigt Tunneln und Zerfließen; die <b>Superposition</b> zweier Eigenzustände schwebt mit der Periode 2π/ΔE. Graue Punkte markieren die ',
    'klassischen Umkehrpunkte V = ⟨E⟩.</p>',

    '<h3>Phasenraum (klassische Mechanik)</h3>',
    '<p>Für <code>ẍ = a(x, ẋ, t)</code>: das Richtungsfeld in der (x, v)-Ebene, Energie-Konturen, Fixpunkte mit Klassifikation ',
    '(Zentrum / Sattel / Knoten / Spirale über die Jacobi-Matrix) und eine live per RK4 integrierte Bahn. Getriebene Systeme nutzen ein ',
    'echtes Teilchen mit gemeinsamer Uhr.</p>',

    '<h3>Fourier</h3>',
    '<p>Jede periodische <code>f</code> als Summe von Sinus und Kosinus. <b>Reihe:</b> beobachte die Konvergenz von <code>S_N</code>; ',
    'an einem Sprung entsteht das ~9%-Überschwingen (<b>Gibbs-Phänomen</b>), ein Balkendiagramm zeigt das Amplitudenspektrum. ',
    '<b>Transformation:</b> <code>F(k)=∫f e^(−ikx)dx</code>, schmal in x ⇒ breit in k: <code>Δx·Δk</code>, minimal (½) für eine Gauß-Funktion.</p>',

    '<h3>Wellen (1-D PDE-Entwicklung)</h3>',
    '<p>Separation der Variablen, animiert. Das Anfangsprofil <code>u₀(x)</code> auf <code>[0, L]</code> wird einmal auf die Sinus-Moden ',
    'projiziert, und jede Mode entwickelt sich <b>exakt</b>:</p>',
    '<ul>',
    '<li><b>Welle</b> <code>u_tt = c²u_xx</code>: Mode n schwingt mit <code>ωₙ = cnπ/L</code>; ein gezupftes Dreieck teilt sich sichtbar in ',
    'zwei laufende Knicke (d’Alembert). Anfangsgeschwindigkeit <code>v₀</code> unterstützt (Klavierhammer). Energie exakt erhalten.</li>',
    '<li><b>Wärme</b> <code>u_t = D·u_xx</code>: Mode n zerfällt wie <code>e^(−Dkₙ²t)</code>; hohe Harmonische zuerst, deshalb glättet Diffusion.</li>',
    '<li><b>Schrödinger</b> <code>iψ_t = −½ψ_xx</code>: dieselbe u₀, aber nichts zerfällt; die Phasen drehen mit <code>Eₙ ∝ n²</code>, ',
    'die Form zerläuft (Dispersion), während <code>∫|ψ|²</code> exakt 1 bleibt.</li>',
    '</ul>',
    '<p>Dieselbe Anregung in alle drei Gleichungen zu geben ist die ganze Lektion: gleiche Moden, drei verschiedene Physiken.</p>',

    '<h3>Moden (kleine Schwingungen)</h3>',
    '<p>N Massen und Federn in Matrixform <code>M·ü = −K·u</code> (Massenmatrix M, Steifigkeitsmatrix K; für kleine N angezeigt). Der Ansatz ',
    '<code>u = φe^(iωt)</code> ergibt das <b>verallgemeinerte Eigenwertproblem (K − ω²M)φ = 0</b>, symmetrisiert als ',
    '<code>K̃ = M^(−1/2)K M^(−1/2)</code> und mit demselben QL-Löser wie im Schrödinger-Lab diagonalisiert.</p>',
    '<ul>',
    '<li><b>Zwei Pendel:</b> eines auslenken; Energie pendelt hin und her mit Schwebungsperiode 2π/Δω.</li>',
    '<li><b>Gleichmäßige Kette:</b> die Modenformen sind abgetastete Sinuswellen; die <b>Dispersions-Ansicht</b> zeigt ωₙ über q und passt zu ',
    '<code>ω = 2√(k/m)·sin(q/2)</code>: das Tor zu den Phononen.</li>',
    '<li><b>Zweiatomige Kette (m, 3m):</b> akustischer + optischer Zweig mit Bandlücke.</li>',
    '<li><b>Freie Enden:</b> Translations-Symmetrie ⇒ eine <b>Nullmode</b> ω₁ = 0.</li>',
    '<li><b>Pendelterm g/ℓ:</b> fügt jeder Masse eine Schwerkraft-Rückstellung hinzu; gekoppelte Pendel.</li>',
    '</ul>',

    '<h3>Streuung (Wirkungsquerschnitt)</h3>',
    '<p>Ein paralleles Teilchenbündel (Energie <code>E = ½v∞²</code>, Stoßparameter <code>b</code>) trifft ein Zentralpotential <code>V(r)</code>. ',
    'Die <b>Ablenkfunktion</b> folgt aus dem exakten klassischen Streuintegral <code>Θ(b) = π − 2∫ b·du/√(1 − b²u² − V/E)</code>, und die ',
    'Strahl-Ansicht integriert echte RK4-Bahnen: die Teilchen werden am Umkehrpunkt sichtbar langsamer.</p>',
    '<ul>',
    '<li><b>dσ/dΩ = (b/sin θ)·|db/dθ|</b> ist die <i>Jacobi-Determinante</i> der Abbildung b → θ. Wo Θ(b) eine flache Stelle hat ',
    '(dθ/db = 0), spitzt sich der Querschnitt zu: <b>Regenbogenstreuung</b> (siehe Lennard-Jones).</li>',
    '<li><b>Rutherford</b> <code>V = k/r</code>: Θ = 2·atan(k/2Eb), dσ/dΩ = (k/4E)²/sin⁴(θ/2) (grüne analytische Kurve). Frontal treffende ',
    'Strahlen stoppen bei <code>r₀ = k/E</code>, so wurde der Kern vermessen. Das anziehende <code>−1/r</code> gibt den <i>identischen</i> Querschnitt.</li>',
    '<li><b>Harte Kugel</b>: isotropes dσ/dΩ = R²/4, gesamt σ = πR², der geometrische Schatten. Langreichweitige Potentiale (Coulomb) haben ',
    'ein <i>divergentes</i> klassisches σ_tot.</li>',
    '<li><b>Strahl beschriften:</b> ein Stoßparameter wird gewählt und der Graph beschriftet das Lehrbuch-Trio: <b>Stoßparameter b</b>, ',
    '<b>r_min</b> und <b>Streuwinkel θ</b>, sowie die <b>Wirkungsquerschnitt-Geometrie</b>: das Rohr <code>b ± db</code>, das sich in den ',
    'Keil <code>dθ</code> öffnet, dessen Flächenverhältnis <i>gerade</i> dσ/dΩ ist. Ein Regler steuert alle drei Ansichten.</li>',
    '</ul>',

    '<h3>Die neuesten Labs</h3>',
    '<p>Die Reiterleiste ist in <b>Mathematik</b> und <b>Physik</b> gruppiert. Kurz:</p>',
    '<ul>',
    '<li><b>Ladungen</b>: Punktladungs-Elektrostatik mit Feldlinien, Äquipotentialen und einer beweglichen <b>Gauß-Kugel</b>: ',
    'ihr numerischer Fluss ∮E·dA wird live mit 4π·Q<sub>ein</sub> verglichen.</li>',
    '<li><b>Spin</b>: ein Qubit auf der <b>Bloch-Kugel</b>: exakte Larmor-Präzession um Ω, Wahrscheinlichkeiten und ',
    'Mess-Buttons, die den Zustand kollabieren.</li>',
    '<li><b>Atom</b>: die reellen <b>Wasserstoff-Orbitale</b> (n ≤ 3): Wahrscheinlichkeitswolke oder vorzeichengefärbte ',
    '|ψ|²-Isofläche, mit Eₙ, ⟨r⟩ und Knotenzahlen.</li>',
    '<li><b>Kreisel</b>: baue einen Körper aus Teilen (Quader, Kugeln, Zylinder, Ringe; <b>T-Griff</b> und ',
    '<b>Tennisschläger</b> als Vorlagen): die App stellt den Trägheitstensor auf, diagonalisiert ihn, zeichnet die ',
    'Hauptachsen, und du wählst die Drehachse, dann beobachte den <b>Dschanibekow-Überschlag</b> um die instabile mittlere Achse. ',
    'Das <b>Drehzentrum</b> ist frei wählbar: Schwerpunkt im Ursprung, Körper an seiner gebauten Position, oder ',
    '<b>in einem Punkt gelagert</b>, dann wird der Tensor per Steiner dorthin verschoben und der Schwerpunkt kreist um das Lager.</li>',
    '<li><b>Kepler</b>: Zentralkraft-Bahnen mit dem <b>Laplace-Runge-Lenz-Vektor</b>, allen drei Kepler-Gesetzen, der ',
    'V<sub>eff</sub>-Ansicht und Periheldrehung für p ≠ 2.</li>',
    '<li><b>Chaos</b>: das Doppelpendel: auseinanderlaufende Zwillingsbahnen und ein <b>Poincaré-Schnitt</b>.</li>',
    '<li><b>Folgen</b>: das <b>ε-N-Spiel</b>, Reihen als Partialsummen und der <b>ε-Schlauch</b>, der punktweise von ',
    'gleichmäßiger Konvergenz trennt.</li>',
    '<li><b>Komplex</b>: <b>Domain Colouring</b> und Gitterbilder komplexer Abbildungen, mit numerischem ',
    '<b>Cauchy-Riemann</b>-Test für Konformität.</li>',
    '</ul>',
    '<h3>Design</h3>',
    '<p>Wechsle hell / dunkel mit <code>☀</code> / <code>☾</code> (oben). <code>⤓ Speichern</code> lädt die aktuelle 3-D-Ansicht als hochauflösendes ',
    '<b>PNG</b> herunter, beschriftet mit dem Ausdruck. Sprache <b>Deutsch / English</b> über den Knopf oben; die Wahl wird gespeichert.</p>',
    '<h3>Eigene Punkte</h3>',
    '<p>Das Panel <b>Eigene Punkte</b> (unten) setzt farbige Marker an genauen Koordinaten. Punkte <b>bleiben über alle Reiter erhalten</b>; ',
    'ein Klick auf das <b>Farbfeld</b> eines Punktes ändert seine Farbe.</p>',
    '<h3>Steuerung</h3>',
    '<p>Links-ziehen drehen · rechts-ziehen (oder Shift+ziehen) verschieben · Rad zoomen · <b>Leertaste</b> abspielen · <b>R</b> Ansicht zurücksetzen.</p>',
    '<p>Jedes Wertefeld eines Reglers ist <b>editierbar</b>. Anklicken und eine exakte Zahl (dann Enter) tippen. Zahlenfelder akzeptieren auch ',
    '<b>konstante Ausdrücke</b>: <code>pi</code>, <code>2pi</code>, <code>pi/4</code>, <code>sqrt(2)</code>, <code>1/3</code>.</p>'
  ].join('');

  VF.I18n = { t: t, getLang: getLang, setLang: setLang, helpDE: helpDE };

})(window.VF = window.VF || {});
