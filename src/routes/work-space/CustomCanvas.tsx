import { useContext, useState, useEffect, useRef } from "react";
import { DataContext, createUndoObj, undoStackObject } from "../../contexts/DataContext";
import { nanoid } from "nanoid";

type CanvasProps = {
  layerName: string
}

export const CustomCanvas = ({ layerName }: CanvasProps) => {
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
    setMainUndoStack,
    layers,
    setLayersUndoStacks,
    layersUndoStacks,
    updateKeyframe,
    currentFrame
  } = contextValues
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (registerCanvasRef) {
      registerCanvasRef(layerName, canvasRef);
    }
  }, [registerCanvasRef, layerName]);


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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    const layerIndex = layers.findIndex(elem => elem.layerName === layerName)
    const canvas = canvasRefs[layerIndex].ref.current;
    if (!canvas) return
    const ctx = canvas?.getContext("2d");
    if (!ctx) return


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

    const layerIndex = layers.findIndex(elem => elem.layerName === layerName)
    const canvas = canvasRefs[layerIndex].ref.current;
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
    setIsDrawing(false);

    const layerIndex = layers.findIndex(elem => elem.layerName === layerName)
    const canvas = canvasRefs[layerIndex].ref.current;

    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.globalCompositeOperation = "source-over"

    // Generar el dataURL
    const canvasDataURL = canvas.toDataURL()

    // Buscar y actualizar el keyframe
    const keyframeId = layers[layerIndex].keyframes[currentFrame].id
    updateKeyframe(layerName, canvasDataURL, keyframeId)
    
    // Agregar accion a undoStack

    const newLayerData = {
      layerName: layerName,
      layerSettings: layers[layerIndex].layerSettings,
      keyframes: layers[layerIndex].keyframes
    }
    const newUndoObject: undoStackObject = createUndoObj("layerAction", newLayerData, canvasDataURL, layerName, nanoid())

    // Agregar el objeto a la linea principal de acciones mainUndoStack
    setMainUndoStack((prev: any) => {
      return [...prev, newUndoObject]
    })

    // Agregar el objeto a la linea secundaria de acciones layersUndoStacks
    setLayersUndoStacks(prevState => ({
      ...prevState,
      [layerName]: prevState[layerName] ? [...prevState[layerName], newUndoObject] : [newUndoObject]
    }));
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);

    const layerIndex = layers.findIndex(elem => elem.layerName === layerName)
    const canvas = canvasRefs[layerIndex].ref.current;

    if (!canvas) return

    // Buscar el valor anterior del canvas en layersStacks
    const layersStack = layersUndoStacks[layerName]
    const previousObj = layersStack[layersStack.length - 1]
    if (!previousObj || !previousObj.canvasDataURL || canvas.toDataURL() === previousObj.canvasDataURL) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.globalCompositeOperation = "source-over"

    // Agregar accion a undoStack
    const canvasDataURL = canvas.toDataURL()
    const newLayerData = {
      layerName: layerName,
      layerSettings: layers[layerIndex].layerSettings,
      keyframes: layers[layerIndex].keyframes
    }
    const newUndoObject: undoStackObject = createUndoObj("layerAction", newLayerData, canvasDataURL, layerName, nanoid())

    // Agregar el objeto a la linea principal de acciones mainUndoStack
    setMainUndoStack((prev: any) => {
      return [...prev, newUndoObject]
    })

    // Agregar el objeto a la linea secundaria de acciones layersUndoStacks
    setLayersUndoStacks(prevState => ({
      ...prevState,
      [layerName]: prevState[layerName] ? [...prevState[layerName], newUndoObject] : [newUndoObject]
    }));
  };



  // Get Z-index
  useEffect(() => {
    const index = layers.findIndex(elem => elem.layerName === layerName)
    setZIndex(index + 20)
  }, [layers])



  return (
    <canvas
      ref={canvasRef}
      className="ws-cs-canvas"
      onMouseDown={handleMouseDown}
      onPointerDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onPointerMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onPointerUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onPointerLeave={handleMouseLeave}
      width={400}
      height={400}
      style={{ zIndex: zIndex, pointerEvents: selectedLayer === layerName ? "auto" : "none" }}
    />
  );
};
