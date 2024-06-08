import { useContext, useState, useEffect, useRef } from "react";
import { DataContext } from "../../contexts/DataContext";
import { Layer } from "../../contexts/DataContext"



type CanvasProps = {
  layerData: Layer
}

export const CustomCanvas = ({ layerData }: CanvasProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [zIndex, setZIndex] = useState<number>(0)
  const contextValues = useContext(DataContext)
  if (!contextValues) throw new Error("useContext must be inside a DataProvider")


  const {
    tool,
    mainColor,
    brushSize,
    canvasRefs,
    selectedLayer,
    registerCanvasRef,
    undoStack,
    layers,
    updateKeyframe,
    currentFrame,
    handleNewUndo,
    checkKeyframes,
  } = contextValues
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (registerCanvasRef) {
      registerCanvasRef(layerData.layerName, canvasRef);
    }
  }, [registerCanvasRef, layerData.layerName]);


  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRefs[0].ref.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const isDrawable = () => {
    // Verificar que sea una capa en la que se pueda dibujar
    const layer = [...layers].find(elem => elem.id === layerData.id)
    if (!layer?.keyframes[currentFrame]) return false
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    const layerIndex = [...layers].findIndex(elem => elem.id === layerData.id)
    const canvas = [...canvasRefs][layerIndex].ref.current;
    if (!canvas) return
    const ctx = canvas?.getContext("2d");
    if (!ctx) return

    // Verificar que sea una capa en la que se pueda dibujar
    if (isDrawable() === false) return

    // Establecer las propiedades del trazo y otros parametros del contexto
    setIsDrawing(true);
    ctx.strokeStyle = "black"
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = mainColor
    ctx.imageSmoothingEnabled = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e);

    const layerIndex = [...layers].findIndex(elem => elem.id === layerData.id)
    const canvas = [...canvasRefs][layerIndex].ref.current;
    const ctx = canvas?.getContext("2d");

    if (ctx) {

      if (tool === "brush") ctx.globalCompositeOperation = "source-over"
      else if (tool === "eraser") ctx.globalCompositeOperation = "destination-out"
      ctx.lineTo(x, y);
      ctx.lineWidth = brushSize
      ctx.stroke();
      ctx.imageSmoothingEnabled = false;
    }
  };

  const handleMouseUp = () => {
    // Establecer isDrawing en false
    setIsDrawing(false);

    // Buscar el índice de la capa actual para luego encontrar el canvas correspondiente
    const layerIndex = [...layers].findIndex(elem => elem.id === layerData.id)
    const canvas = [...canvasRefs][layerIndex].ref.current;

    // Verificar que el canvas está definido y obtener el contexto
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Establecer la composición global en "source-over" para evitar que borre el trazo en vez de dibujarlo
    ctx.globalCompositeOperation = "source-over"

    // Generar el dataURL
    const canvasDataURL = canvas.toDataURL()

    // Buscar y actualizar el keyframe
    const keyframeId = layers[layerIndex].keyframes[currentFrame].id
    updateKeyframe(layerData.id, canvasDataURL, keyframeId)

    // Actualiza layers localmente antes de crear el undoObj
    const updatedLayers = [...layers];
    updatedLayers[layerIndex].keyframes[currentFrame].dataURL = canvasDataURL;

    handleNewUndo(layerData.layerName, currentFrame, updatedLayers, "layerEvent");
    checkKeyframes();
  };

  const handleMouseLeave = () => {

  };



  // Get Z-index
  useEffect(() => {
    const index = [...layers].findIndex(elem => elem.id === layerData.id)
    setZIndex(index + 100)
  }, [layers])



  return (
    <canvas
      ref={canvasRef}
      className="ws-cs-canvas"
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseLeave}
      width={882}
      height={582}
      style={{
        zIndex: zIndex,
        pointerEvents: selectedLayer === layerData.layerName ? "auto" : "none",
        cursor: isDrawable() === false ? "not-allowed" : "auto",
        opacity: layerData.layerSettings.opacity
      }}
    />
  );
};
