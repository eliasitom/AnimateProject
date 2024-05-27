import React, { createContext, ReactNode, useState, useRef, Dispatch, SetStateAction, useCallback, useEffect } from "react"
import { nanoid } from "nanoid"






interface Keyframe {
  dataURL: string
  state: "empty" | "filled"
  parentLayerName: string
  id: string
}

interface Layer {
  layerName: string
  layerSettings: { opacity: number, lock: boolean, layerLevel: number }
  keyframes: Keyframe[]
}

const defaultLayerSettings = {
  opacity: 1,
  lock: false,
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
  undoType: "layerAction" | "newLayer"
  layerData: Layer
  canvasDataURL: string | undefined
  layerStackName: string
  undoObjId: string
}

export const createUndoObj = (
  undoType: "layerAction" | "newLayer",
  layerData: Layer,
  canvasDataURL: string | undefined,
  layerStackName: string,
  undoObjId: string
): undoStackObject => {
  return {
    undoType,
    layerData,
    canvasDataURL,
    layerStackName,
    undoObjId
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
  layersUndoStacks: { [layerStackName: string]: undoStackObject[] }
  setLayersUndoStacks: Dispatch<SetStateAction<{ [layerStackName: string]: undoStackObject[] }>>
  layers: Layer[]
  setLayers: Dispatch<SetStateAction<Layer[]>>
  selectedLayer: string
  setSelectedLayer: Dispatch<SetStateAction<string>>
  handleNewEmptyFrame: () => void
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
    undoType: "layerAction",
    layerData: { keyframes: [defaultKeyframe("Layer_0")], layerName: "Layer_0", layerSettings: { layerLevel: 0, lock: false, opacity: 1 } },
    canvasDataURL: undefined,
    layerStackName: "Layer_0",
    undoObjId: nanoid()
  }
  const [mainUndoStack, setMainUndoStack] = useState<undoStackObject[]>([defaultUndoObj]);
  const [redoStack, setRedoStack] = useState<undoStackObject[]>([]);

  const initialLayersUndoStacks = { Layer_0: [defaultUndoObj] }
  const [layersUndoStacks, setLayersUndoStacks] = useState<{ [layerStackName: string]: undoStackObject[] }>(initialLayersUndoStacks)

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
    const previousUndo = mainUndoStack[mainUndoStack.length - 1];

    if (previousUndo.undoType === "newLayer") {
      handleDeleteLayer(previousUndo.layerData.layerName)

      setRedoStack([...redoStack, previousUndo]);

      // Actualizar el stack de undo
      const newUndoStack = mainUndoStack.slice(0, -1);
      setMainUndoStack(newUndoStack);
    } else if (previousUndo.undoType === "layerAction" && previousUndo.canvasDataURL) {
      // Obtener el indice del canvas en canvasRefs
      console.log(mainUndoStack[mainUndoStack.length - 1])
      const layerName = previousUndo.layerData.layerName
      const layerIndex = canvasRefs.current.findIndex(elem => elem.layerName === layerName)

      // Obtener el canvas en el índice especificado
      const canvas = canvasRefs.current[layerIndex];

      // Verificar que el canvas existe y que hay más de una imagen en undoStack
      if (!canvas || !canvas.ref.current || mainUndoStack.length <= 1) return;

      // Obtener el contexto del canvas
      const ctx = canvas.ref.current.getContext('2d');
      if (!ctx) return;

      // Obtener el último objeto del stack
      const lastUndoObj = mainUndoStack[mainUndoStack.length - 1];
      setRedoStack([...redoStack, lastUndoObj]);

      // Actualizar el stack de undo
      const newUndoStack = mainUndoStack.slice(0, -1);
      setMainUndoStack(newUndoStack);

      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.ref.current.width, canvas.ref.current.height);

      // Buscar el índice del ultimo undoObj
      const lastUndoObjIndex = layersUndoStacks[lastUndoObj.layerStackName].findIndex(elem => elem.undoObjId === lastUndoObj.undoObjId)

      // Usar el índice del último undoObj para encontrar el undoObj anterior a ese
      const previousObj = layersUndoStacks[lastUndoObj.layerStackName][lastUndoObjIndex - 1]
      console.log(previousObj)
      if (!previousObj) return

      if (!previousObj.canvasDataURL) return
      const img = new Image();
      img.src = previousObj.canvasDataURL;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }



  const handleRedo = () => {
    //Obtener el último redo
    const lastRedo = redoStack[redoStack.length - 1];

    //Obtener layer actual
    const layerName = lastRedo.layerData.layerName
    const layerIndex = canvasRefs.current.findIndex(elem => elem.layerName === layerName)

    //Eliminarlo y agregarlo a undoStack
    setRedoStack(redoStack.slice(0, -1));
    setMainUndoStack([...mainUndoStack, lastRedo]);

    if (lastRedo && lastRedo.undoType === "newLayer") {
      setLayers(prev => {
        const position = lastRedo.layerData.layerSettings.layerLevel + 1
        const layer = lastRedo.layerData

        // Crear un nuevo array con el nuevo elemento insertado en la posición deseada
        const newLayers = [
          ...prev.slice(0, position),
          layer,
          ...prev.slice(position)
        ];
        return newLayers;
      })
    } else if (lastRedo.undoType === "layerAction") {
      const canvas = canvasRefs.current[layerIndex];
      if (!canvas || !canvas.ref.current || redoStack.length === 0) return;

      const ctx = canvas.ref.current.getContext('2d');
      if (!ctx) return;

      if (!lastRedo.canvasDataURL) return // esto en el caso de que undoType sea "layerAction"

      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.ref.current.width, canvas.ref.current.height);


      // Dibujar el último valor de redoStack
      const img = new Image();
      img.src = lastRedo.canvasDataURL;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  };


  const handleDeleteLayer = (layerName: string) => {
    setLayers(prev => {
      return prev.filter(elem => elem.layerName !== layerName)
    })
  }




  const handleNewEmptyFrame = () => {
    setLayers(prev => {
      let newLayers = [...prev]

      newLayers = newLayers.map(currentLayer => {
        if (currentLayer.layerName === selectedLayer) {
          if (currentFrame > currentLayer.keyframes.length - 1) {
            let newKeyframesList: Keyframe[] = []

            for (let i = 0; i < currentFrame + 1; i++) {
              if (!currentLayer.keyframes[i]) {
                newKeyframesList = [...newKeyframesList, defaultKeyframe(selectedLayer)]
              }
            }

            currentLayer.keyframes = [...currentLayer.keyframes, newKeyframesList].flat()
          } else {
            currentLayer.keyframes = [...currentLayer.keyframes, defaultKeyframe(selectedLayer)]
            setCurrentFrame(currentLayer.keyframes.length - 1)
          }
        }
        return currentLayer
      })
      return newLayers
    })
  }

  // const handleNewEmptyFrame = () => {
  //   setLayers(prev => {
  //     let newLayers = [...prev]

  //     newLayers = newLayers.map(currentLayer => {
  //       const newLayer = {...currentLayer}
  //       if (newLayer.layerName === selectedLayer) {
  //         let newKeyframesList: Keyframe[] = []

  //         for (let i = 0; i < currentFrame; i++) {
  //           if(!newLayer.keyframes[i]) {
  //             newKeyframesList = [...newKeyframesList, defaultKeyframe(selectedLayer)]
  //           }
  //         }

  //         newLayer.keyframes = [...newLayer.keyframes, newKeyframesList].flat()
  //       }
  //       return newLayer
  //     })
  //     return newLayers
  //   })
  // }



  const updateKeyframe = (layerName: string, dataURL: string, keyframeId: string) => {
    setLayers(prev => {
      let newLayers = [...prev]
      newLayers = newLayers.map(currentLayer => {
        if (currentLayer.layerName === layerName) {
          currentLayer.keyframes = currentLayer.keyframes.map(currentKeyframe => {
            if (currentKeyframe.id === keyframeId) {
              currentKeyframe.dataURL = dataURL
            }
            return currentKeyframe
          })
        }
        return currentLayer
      })
      return newLayers
    })
  }


  // Dibujar las capas actuales luego de cambiar de frame
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
  }, [currentFrame])



  useEffect(() => {
    console.log(layers)
  }, [currentFrame])

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
    layersUndoStacks,
    setLayersUndoStacks,
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