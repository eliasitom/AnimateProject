import React, { createContext, ReactNode, useState, useRef, Dispatch, SetStateAction, useCallback, useEffect } from "react"
import { nanoid } from "nanoid"






interface Keyframe {
  dataURL: string
  state: "empty" | "filled"
  parentLayerName: string
  id: string
}

export interface Layer {
  layerName: string
  layerSettings: { opacity: number, hidden: boolean, lock: boolean, layerLevel: number }
  keyframes: Keyframe[],
  id: string
}

const defaultLayerSettings = {
  opacity: 1,
  lock: false,
  hidden: false
};

const defaultKeyframe = (parentLayerName: string): Keyframe => ({
  dataURL: "",
  state: "empty",
  parentLayerName,
  id: nanoid()
});

export const createLayer = (
  layerName: string,
  layerLevel: number
): Layer => {
  const initialKeyframe = defaultKeyframe(layerName)
  return {
    layerName,
    layerSettings: { ...defaultLayerSettings, layerLevel },
    keyframes: [initialKeyframe],
    id: nanoid()
  };
};


interface DataProviderProps {
  children: ReactNode;
}

interface CanvasRef {
  ref: React.RefObject<HTMLCanvasElement>
  layerName: string
}

export interface undoStackObject {
  undoType?: "layerEvent" | "newLayer" | "newKeyframe",
  selectedLayer: string,
  currentFrameIndex: number,
  layers: Layer[],
  undoId: string
}

export const createUndoObj = (
  selectedLayer: string,
  currentFrameIndex: number,
  layers: Layer[],
  undoType?: "layerEvent" | "newLayer" | "newKeyframe"
): undoStackObject => {
  return {
    selectedLayer,
    currentFrameIndex,
    layers: layers.map(layer => ({
      ...layer,
      keyframes: layer.keyframes.map(keyframe => ({ ...keyframe }))
    })),
    undoId: nanoid(),
    undoType
  };
};



interface DataContextValue {
  mainColor: string;
  setMainColor: (color: string) => void;
  tool: string
  setTool: (tool: string) => void
  brushSize: number
  setBrushSize: Dispatch<SetStateAction<number>>
  canvasRefs: CanvasRef[]
  registerCanvasRef: (layerName: string, ref: React.RefObject<HTMLCanvasElement>) => void
  mainUndoStack: undoStackObject[]
  setMainUndoStack: Dispatch<SetStateAction<undoStackObject[]>>
  redoStack: undoStackObject[]
  setRedoStack: Dispatch<SetStateAction<undoStackObject[]>>
  handleUndo: () => void
  handleRedo: () => void
  layers: Layer[]
  setLayers: Dispatch<SetStateAction<Layer[]>>
  selectedLayer: string
  setSelectedLayer: Dispatch<SetStateAction<string>>
  handleNewEmptyFrame: (method: "empty" | "clone") => void
  updateKeyframe: (layerName: string, dataURL: string, keyframeId: string) => void
  currentFrame: number
  setCurrentFrame: Dispatch<SetStateAction<number>>
  keyframesLength: number
  setKeyframesLength: Dispatch<SetStateAction<number>>
}


export const DataContext = createContext<DataContextValue | null>(null)





export const DataProvider = ({ children }: DataProviderProps) => {
  const canvasRefs = useRef<CanvasRef[]>([]);

  const registerCanvasRef = useCallback((layerName: string, ref: React.RefObject<HTMLCanvasElement>) => {
    const existingIndex = canvasRefs.current.findIndex(canvas => canvas.layerName === layerName);
    if (existingIndex >= 0) {
      canvasRefs.current[existingIndex] = { ref, layerName };
    } else {
      canvasRefs.current.push({ ref, layerName });
    }
  }, []);

  const [tool, setTool] = useState("brush")
  const [mainColor, setMainColor] = useState("#332941")
  const [brushSize, setBrushSize] = useState(12)

  const defaultUndoObj: undoStackObject = {
    layers: [{
      keyframes: [defaultKeyframe("Layer_0")],
      layerName: "Layer_0",
      layerSettings: { layerLevel: 0, lock: false, opacity: 1, hidden: false },
      id: nanoid()
    }],
    undoId: nanoid(),
    currentFrameIndex: 0,
    selectedLayer: "Layer_0"
  }
  const [mainUndoStack, setMainUndoStack] = useState<undoStackObject[]>([defaultUndoObj]);
  const [redoStack, setRedoStack] = useState<undoStackObject[]>([]);

  // Crear un layer inicial genérico
  const initialLayer = createLayer("Layer_0", 0);

  // Inicializar el estado con ese layer
  const [layers, setLayers] = useState<Layer[]>([initialLayer]);
  const [selectedLayer, setSelectedLayer] = useState<string>("Layer_0")

  const [currentFrame, setCurrentFrame] = useState(0)
  const [keyframesLength, setKeyframesLength] = useState(1)




  const getKeyframesLength = () => {
    const newKeyframesLength = layers.reduce((max, layer) => (layer.keyframes.length > max ? layer.keyframes.length : max), -Infinity);
    setKeyframesLength(newKeyframesLength)
  }





  const handleUndo = () => {
    const previousUndoObj = mainUndoStack[mainUndoStack.length - 2]
    const lastUndoObj = mainUndoStack[mainUndoStack.length - 1]

    // Actualizar el estado global de la aplicacion: layers, selectedFrame, currentFrameIndex
    setLayers(previousUndoObj.layers)
    setSelectedLayer(previousUndoObj.selectedLayer)
    setCurrentFrame(previousUndoObj.currentFrameIndex)

    // Eliminar el último valor de mainUndoStack y agregarlo a redoStack
    setMainUndoStack(prev => {
      const newUndoStack = [...prev].filter(elem => elem.undoId !== lastUndoObj.undoId)
      return newUndoStack
    })
    setRedoStack(prev => [...prev, lastUndoObj])
  }

  const handleRedo = () => {
    const lastRedoObj = redoStack[redoStack.length - 1]

    // Actualizar el estado global de la aplicacion: layers, selectedFrame, currentFrameIndex
    setLayers(lastRedoObj.layers)
    setSelectedLayer(lastRedoObj.selectedLayer)
    setCurrentFrame(lastRedoObj.currentFrameIndex)

    // Actualizar mainUndoStack y redoStack
    setMainUndoStack(prev => [...prev, lastRedoObj])
    setRedoStack(prev => {
      const newRedoStack = [...prev].filter(elem => elem.undoId !== lastRedoObj.undoId)
      return newRedoStack
    })
    
  };


  const handleNewEmptyFrame = (method: "empty" | "clone") => {
    let newLayers = [...layers]
    let keyframesLength = 0

    newLayers = newLayers.map(currentLayer => {
      let newCurrentLayer = { ...currentLayer }
      if (newCurrentLayer.layerName === selectedLayer) {

        if (currentFrame > newCurrentLayer.keyframes.length - 1) {

          // Generar una lista de los nuevos keyframes y agregarlos a la capa
          let newKeyframesList: Keyframe[] = []

          let newKeyframeTemplate
          
          if(method === "empty") {
            newKeyframeTemplate = defaultKeyframe(selectedLayer)
          } else {
            newKeyframeTemplate = newCurrentLayer.keyframes[newCurrentLayer.keyframes.length - 1]
          }

          for (let i = 0; i < currentFrame + 1; i++) {
            if (!newCurrentLayer.keyframes[i]) {
              newKeyframesList = [...newKeyframesList, newKeyframeTemplate]
            }
          }
          newCurrentLayer.keyframes = [...newCurrentLayer.keyframes, newKeyframesList].flat()
        } else {
          const newKeyframe = defaultKeyframe(selectedLayer)
          newCurrentLayer.keyframes = [...newCurrentLayer.keyframes, newKeyframe]
          setCurrentFrame(newCurrentLayer.keyframes.length - 1)
          keyframesLength = newCurrentLayer.keyframes.length - 1
        }
      }
      return newCurrentLayer
    })

    setLayers(newLayers)

    // Crear un nuevo undoObj
    const newUndoObject = createUndoObj(
      selectedLayer,
      keyframesLength,
      newLayers,
      "newKeyframe"
    )

    // Enviar el nuevo undoObj a mainUndoStack
    setMainUndoStack(prev => [...prev, newUndoObject])
  }




  // Actualizar un keyframe luego de dibujar en el (esta función se llama desde el canvas luego de modificarlo)
  const updateKeyframe = (layerName: string, dataURL: string, keyframeId: string) => {    
    let newLayers = [...layers]

    newLayers = newLayers.map(currentLayer => {
      let currentNewLayer = { ...currentLayer }
      if (currentNewLayer.layerName === layerName) {
        currentNewLayer.keyframes = currentNewLayer.keyframes.map(currentKeyframe => {
          if (currentKeyframe.id === keyframeId) {
            currentKeyframe.dataURL = dataURL
          }
          return currentKeyframe
        })
      }
      return currentNewLayer
    })

    setLayers(newLayers)
  }


  // Dibujar las capas actuales luego de cambiar de frame o hacer CTRL + Z
  useEffect(() => {
    canvasRefs.current.map((currentRef) => {
      const canvasRef = currentRef.ref.current
      if (!canvasRef) return
      const ctx = canvasRef.getContext("2d")
      if (!ctx) return

      // Buscar la capa correspondiente
      const layer = layers.find(elem => elem.layerName === currentRef.layerName)

      if (!layer) return

      // Limpiar el canvas
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

      // Dibujar el último valor de redoStack
      if (!layer.keyframes[currentFrame]) return

      const img = new Image();
      img.src = layer?.keyframes[currentFrame].dataURL;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    })
  }, [currentFrame, layers])


  useEffect(() => {
    getKeyframesLength()
  }, [layers])


  const value: DataContextValue = {
    mainColor,
    setMainColor,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    canvasRefs: canvasRefs.current,
    registerCanvasRef,
    mainUndoStack,
    setMainUndoStack,
    redoStack,
    setRedoStack,
    handleUndo,
    handleRedo,
    layers,
    setLayers,
    selectedLayer,
    setSelectedLayer,
    handleNewEmptyFrame,
    updateKeyframe,
    currentFrame,
    setCurrentFrame,
    keyframesLength,
    setKeyframesLength
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}