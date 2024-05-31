import React, { createContext, ReactNode, useState, useRef, Dispatch, SetStateAction, useCallback, useEffect, RefAttributes } from "react"
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
  undoType?: string | undefined
  selectedLayer: string
  currentFrameIndex: number
  layers: Layer[]
  undoId: string
}

export const createUndoObj = (
  selectedLayer: string,
  currentFrameIndex: number,
  layers: Layer[],
  undoType?: string | undefined
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
  undoStack: undoStackObject[]
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
  handleNewUndo: (selectedLayer_: string | undefined, currentFrame_: number | undefined, layers_: Layer[] | undefined, undoType_: string | undefined) => void
  checkKeyframes: () => void
  handlePlay: () => void
  isPlaying: boolean
  setIsPlaying: Dispatch<SetStateAction<boolean>>
  onionSkin: boolean
  setOnionSkin: Dispatch<SetStateAction<boolean>>
  isLoop: boolean
  setIsLoop: Dispatch<SetStateAction<boolean>>
  frameRate: number
  setFrameRate: Dispatch<SetStateAction<number>>
  handleStop: () => void
}


export const DataContext = createContext<DataContextValue | null>(null)





export const DataProvider = ({ children }: DataProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
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
  const [undoStack, setUndoStack] = useState<undoStackObject[]>([defaultUndoObj]);
  const [redoStack, setRedoStack] = useState<undoStackObject[]>([]);

  // Crear un layer inicial genérico
  const initialLayer = createLayer("Layer_0", 0);

  // Inicializar el estado con ese layer
  const [layers, setLayers] = useState<Layer[]>([initialLayer]);
  const [selectedLayer, setSelectedLayer] = useState<string>("Layer_0")
  const [buffers, setBuffers] = useState<HTMLCanvasElement[][]>([]);

  const [currentFrame, setCurrentFrame] = useState(0)
  const [keyframesLength, setKeyframesLength] = useState(1)
  const [frameRate, setFrameRate] = useState(24)
  // Onion Skin
  const [onionSkin, setOnionSkin] = useState(true)
  const [isLoop, setIsLoop] = useState(false)


  const getKeyframesLength = () => {
    const newKeyframesLength = layers.reduce((max, layer) => (layer.keyframes.length > max ? layer.keyframes.length : max), -Infinity);
    setKeyframesLength(newKeyframesLength)
  }





  // Agrega shouldStop al estado
  const shouldStopRef = useRef(false);

  useEffect(() => {
    // Precargar las imágenes y crear los buffers
    const loadBuffers = async () => {
      const buffers = await Promise.all(layers.map(async (layer) => {
        return Promise.all(layer.keyframes.map(async (frame) => {
          const bufferCanvas = document.createElement("canvas");
          const ctx = bufferCanvas.getContext("2d");
          if (!ctx) return bufferCanvas;

          const img = new Image();
          img.src = frame.dataURL;

          return new Promise<HTMLCanvasElement>((resolve) => {
            img.onload = () => {
              bufferCanvas.width = img.width;
              bufferCanvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              resolve(bufferCanvas);
            };

            img.onerror = () => resolve(bufferCanvas);
          });
        }));
      }));

      setBuffers(buffers);
    };

    loadBuffers();
  }, [layers, setBuffers]);

  const handlePlay = () => {
    const prevOnionLayerValue = onionSkin

    setIsPlaying(true);
    setOnionSkin(false);
    shouldStopRef.current = false

    let counter = currentFrame;
    const intervalTime = 1000 / frameRate; // Calcula el tiempo entre cada fotograma en milisegundos

    if (counter === keyframesLength - 1) counter = -1;

    const playAnimation = () => {
      if (shouldStopRef.current) {
        setOnionSkin(prevOnionLayerValue);
        setIsPlaying(false);
        return;
      } // Detener la animación si shouldStop es true

      if (counter >= keyframesLength - 1) {
        if (isLoop) {
          counter = -1;
        } else {
          setOnionSkin(prevOnionLayerValue);
          setIsPlaying(false);
          return;
        }
      }

      setTimeout(playAnimation, intervalTime); // Usa setTimeout en lugar de requestAnimationFrame

      canvasRefs.current.forEach((currentRef, index) => {
        const layerBuffers = buffers[index];
        if (!layerBuffers) return;

        const frontCanvas = currentRef.ref.current;
        if (!frontCanvas) return;

        const ctx = frontCanvas.getContext("2d");
        if (!ctx) return;

        const bufferCanvas = layerBuffers[counter + 1];
        if (!bufferCanvas) return;

        ctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        ctx.drawImage(bufferCanvas, 0, 0);
      });

      counter++;
      setCurrentFrame(counter);
    };

    playAnimation(); // Inicia la animación
  };

  const handleStop = () => {
    shouldStopRef.current = true;
    setIsPlaying(false);
  };


  const handleNewUndo = (selectedLayer_: string | undefined, currentFrame_: number | undefined, layers_: Layer[] | undefined, undoType_: string | undefined) => {

    // Crear un undoObj
    const newUndoObject: undoStackObject =
      createUndoObj(
        selectedLayer_ ? selectedLayer_ : selectedLayer,
        currentFrame_ ? currentFrame_ : currentFrame,
        layers_ ? layers_ : layers,
        undoType_ ? undoType_ : "empty"
      )

    // Agregar el objeto a la linea principal de acciones undoStack
    setUndoStack((prev: any) => {
      return [...prev, newUndoObject]
    })
  }

  const handleUndo = () => {
    const previousUndoObj = undoStack[undoStack.length - 2]
    const lastUndoObj = undoStack[undoStack.length - 1]

    // Actualizar el estado global de la aplicacion: layers, selectedFrame, currentFrameIndex
    setLayers(previousUndoObj.layers)
    setSelectedLayer(previousUndoObj.selectedLayer)
    setCurrentFrame(previousUndoObj.currentFrameIndex)

    // Eliminar el último valor de undoStack y agregarlo a redoStack
    setUndoStack(prev => {
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

    // Actualizar undoStack y redoStack
    setUndoStack(prev => [...prev, lastRedoObj])
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

          if (method === "empty") {
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
    handleNewUndo(selectedLayer, keyframesLength, newLayers, "newKeyframe")
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
    if (isPlaying) return

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
  }, [undoStack, redoStack, currentFrame])





  // Verificar si el canvas está vacio o no
  const isCanvasEmpty = async (dataURL: string) => {
    const image = new Image();
    image.src = dataURL;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return

    ctx.drawImage(image, 0, 0);
    const pixelData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] !== 0) {
        return false;
      }
    }
    return true;
  };

  const checkKeyframes = () => {
    const updateLayers = async () => {
      const newLayers = await Promise.all(
        layers.map(async (currentLayer) => {
          const newCurrentLayer = { ...currentLayer };

          newCurrentLayer.keyframes = await Promise.all(
            newCurrentLayer.keyframes.map(async (currentKeyframe) => {
              const isEmpty = await isCanvasEmpty(currentKeyframe.dataURL);
              if (isEmpty) currentKeyframe.state = 'empty';
              else currentKeyframe.state = 'filled';
              return currentKeyframe;
            })
          );

          return newCurrentLayer;
        })
      );

      setLayers(newLayers);
    };

    updateLayers();
  }


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
    undoStack,
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
    setKeyframesLength,
    handleNewUndo,
    checkKeyframes,
    handlePlay,
    isPlaying,
    setIsPlaying,
    onionSkin,
    setOnionSkin,
    frameRate,
    setFrameRate,
    isLoop,
    setIsLoop,
    handleStop
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}