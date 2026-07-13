'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import SignatureCanvas from 'react-signature-canvas';

/**
 * Props del componente SignaturePad.
 * @property onSignatureChange - Callback invocado cuando cambia el estado de la firma
 *   (vacía / no vacía). Recibe `true` si el canvas está vacío, `false` si tiene contenido.
 */
interface SignaturePadProps {
  onSignatureChange: (isEmpty: boolean) => void;
}

/**
 * Handle expuesto por el ref de SignaturePad.
 * Permite al componente padre extraer la imagen, limpiar o consultar el estado.
 */
interface SignaturePadHandle {
  /** Devuelve la firma como data URL (PNG base64). */
  toDataURL: () => string;
  /** Limpia el canvas de firma. */
  clear: () => void;
  /** Devuelve true si el canvas no tiene trazos. */
  isEmpty: () => boolean;
}

/**
 * SignaturePad — Componente cliente para captura de firma digital.
 *
 * Envuelve `react-signature-canvas` con UX adaptada a kiosco táctil:
 *   - Placeholder instructivo que desaparece al primer trazo.
 *   - Botón "Limpiar firma" para reiniciar.
 *   - ResizeObserver para mantener el canvas sincronizado con el
 *     ancho del contenedor.
 *
 * Usa `forwardRef` + `useImperativeHandle` para exponer un handle
 * tipado (`SignaturePadHandle`) al componente padre.
 *
 * @performance El ResizeObserver solo re-dimensiona el canvas (operación
 *   nativa, no provoca re-render de React). Los callbacks de firma
 *   (`onBegin`, `onEnd`) son estables gracias a `useCallback`.
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onSignatureChange }, ref) {
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [signatureIsEmpty, setSignatureIsEmpty] = useState(true);

    // ── Imperative handle ──────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      toDataURL: (): string => {
        return sigCanvasRef.current?.toDataURL() ?? '';
      },
      clear: (): void => {
        sigCanvasRef.current?.clear();
        setSignatureIsEmpty(true);
        onSignatureChange(true);
      },
      isEmpty: (): boolean => {
        return sigCanvasRef.current?.isEmpty() ?? true;
      },
    }));

    // ── Resize observer para mantener el canvas al ancho del contenedor ─
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeCanvas = () => {
        const canvas = sigCanvasRef.current;
        if (!canvas) return;

        const canvasElement = canvas.getCanvas();
        const rect = container.getBoundingClientRect();

        // Solo redimensionar si el ancho realmente cambió
        if (canvasElement.width !== Math.floor(rect.width)) {
          canvasElement.width = Math.floor(rect.width);
          canvasElement.height = 300;
          // Limpiar tras resize (el canvas se resetea al cambiar dimensiones)
          canvas.clear();
          setSignatureIsEmpty(true);
          onSignatureChange(true);
        }
      };

      // Dimensión inicial
      resizeCanvas();

      const observer = new ResizeObserver(() => {
        resizeCanvas();
      });

      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }, [onSignatureChange]);

    // ── Callbacks de estado de firma ───────────────────────────────
    const handleBegin = useCallback(() => {
      // Al iniciar un trazo, el canvas deja de estar vacío
      setSignatureIsEmpty(false);
      onSignatureChange(false);
    }, [onSignatureChange]);

    const handleEnd = useCallback(() => {
      const isEmpty = sigCanvasRef.current?.isEmpty() ?? true;
      setSignatureIsEmpty(isEmpty);
      onSignatureChange(isEmpty);
    }, [onSignatureChange]);

    /** Limpia la firma y notifica al padre. */
    const handleClear = useCallback(() => {
      sigCanvasRef.current?.clear();
      setSignatureIsEmpty(true);
      onSignatureChange(true);
    }, [onSignatureChange]);

    return (
      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Firma Digital
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-[#1E40AF] underline hover:text-[#1E40AF]/80 transition-colors"
          >
            Limpiar firma
          </button>
        </div>

        {/* Canvas container con placeholder */}
        <div ref={containerRef} className="relative w-full" style={{ height: 300 }}>
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="#1E40AF"
            canvasProps={{
              className: 'w-full rounded-lg cursor-crosshair',
              style: { touchAction: 'none', height: 300 },
            }}
            onBegin={handleBegin}
            onEnd={handleEnd}
          />

          {/* Placeholder visible solo cuando el canvas está vacío */}
          {signatureIsEmpty && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <p className="text-gray-300 text-sm select-none">
                Firme aquí utilizando su dedo o lápiz óptico
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;

export type { SignaturePadHandle, SignaturePadProps };

/*
 * ── Decisiones técnicas ──────────────────────────────────────────────
 *
 * 1. forwardRef + useImperativeHandle: Se expone un handle controlado
 *    en lugar del ref directo al SignatureCanvas, para mantener una API
 *    limpia y tipada (`SignaturePadHandle`) y evitar acoplar al padre
 *    con la implementación interna de react-signature-canvas.
 *
 * 2. ResizeObserver en vez de `window.onresize`: Es más preciso porque
 *    detecta cambios de tamaño del contenedor específico, no solo de la
 *    ventana. Necesario para layouts flexibles en diferentes tablets.
 *
 * 3. El canvas se limpia automáticamente tras un resize porque el
 *    elemento <canvas> pierde su contenido al cambiar width/height.
 *    Se notifica al padre que la firma quedó vacía.
 *
 * 4. `pointer-events-none` en el placeholder para que no intercepte
 *    los eventos táctiles destinados al canvas de firma.
 *
 * 5. `touchAction: 'none'` en el canvas para prevenir que el navegador
 *    interprete los trazos como gestos de scroll/zoom.
 *
 * Edge cases cubiertos:
 *   - SSR: SignatureCanvas solo se monta en el cliente (es 'use client').
 *   - Resize: canvas redimensionado + limpieza + notificación al padre.
 *   - Cleanup del ResizeObserver al desmontar.
 *   - ref nulo: fallback seguro con optional chaining y valores por defecto.
 */
