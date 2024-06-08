import { useResolution } from "../../custom-hooks/useResolutions"
import "../../stylesheets/routes/work-space/WorkSpaceRoute.css"

import { FaPaintBrush, FaEraser, FaPlay, FaStop } from "react-icons/fa";
import { IoArrowUndo, IoArrowRedo, IoPlayBackSharp, IoPlayForwardSharp } from "react-icons/io5";
import { BiLayerPlus } from "react-icons/bi";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { TiArrowDownThick, TiArrowUpThick } from "react-icons/ti";
import { TbDeviceIpadHorizontalPlus, TbDeviceTabletPlus, TbLayersSelected, TbLayersOff } from "react-icons/tb";
import { ImLoop } from "react-icons/im"


import { CustomCanvas } from "./CustomCanvas";
import React, { useContext, useEffect, useState, useRef } from "react";
import { DataContext, createLayer } from "../../contexts/DataContext";
import { ToolsSectionBody } from "./ToolsSectionBody";
import { OnionSkin } from "./OnionSkin";






export const WorkSpaceRoute = () => {
  const { windowWidth } = useResolution()

  const contextValues = useContext(DataContext)
  if (!contextValues) throw new Error("useContext must be inside a DataProvider")
  const {
    tool,
    brushSize,
    setTool,
    mainColor,
    undoStack,
    redoStack,
    handleNewUndo,
    handleUndo,
    handleRedo,
    layers,
    setLayers,
    selectedLayer,
    setSelectedLayer,
    handleNewEmptyFrame,
    currentFrame,
    setCurrentFrame,
    keyframesLength,
    canvasRefs,
    handlePlay,
    onionSkin,
    setOnionSkin,
    frameRate,
    setFrameRate,
    isPlaying,
    isLoop,
    setIsLoop,
    handleStop
  } = contextValues

  const mediaQueriesStyles = {
    display: windowWidth <= 768 ? "none" : "flex"
  }

  /*
  Cuando se entra en modo de edición de una capa 
  (específicamente en edición del nombre de la capa) 
  se cambia el estado a true y se establece el id de la capa
  */
  interface IsEditingLayer {
    active: boolean,
    layerId?: string
  }
  const [isEditingLayer, setIsEditingLayer] = useState<IsEditingLayer>({ active: false })
  const [newLayerName, setNewLayerName] = useState<string>("")



  const layersContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);











  const handleScroll = (source: 'container1' | 'container2') => {
    const sourceContainer = source === 'container1' ? layersContainerRef.current : timelineContainerRef.current;
    const targetContainer = source === 'container1' ? timelineContainerRef.current : layersContainerRef.current;

    if (sourceContainer && targetContainer) {
      targetContainer.scrollTop = sourceContainer.scrollTop;
    }
  };


  // Generador de índices para el navegador del timeline
  const frameIndexGenerator = Array.from({ length: keyframesLength }, (_, index) => (
    <div
      className={`ws-tls-nav-frame ${index === currentFrame ? "current-frame" : ""}`}
      onClick={() => setCurrentFrame(index)}
      key={index}
    />
  ));

  const handleKeyframeClick = (index: number, layerName: string) => {
    setCurrentFrame(index)
    setSelectedLayer(layerName)
  }



  const handleNewLayer = () => {
    // Crear la nueva capa y agregarla a layers[]
    const newLayerName = `Layer_` + (layers.length).toString()

    const layerLevel = layers.length === 1 ? 1 : layers.length
    const newLayer = createLayer(newLayerName, layerLevel)

    let newLayers = [...layers]
    newLayers = [...newLayers, newLayer]
    setLayers(newLayers)

    // Seleccionar la nueva capa
    setSelectedLayer(newLayerName)

    // Crear un undoObj
    handleNewUndo(newLayerName, currentFrame, newLayers, "newLayer")
  }

  const handleLayerVisibility = (layerName: string) => {
    setLayers(prev => {
      let newLayers = [...prev]

      newLayers = newLayers.map(currentLayer => {
        if (currentLayer.layerName === layerName) {
          currentLayer.layerSettings.hidden = !currentLayer.layerSettings.hidden
        }
        return currentLayer
      })
      return newLayers
    })
  }
  const handleLayerOpacity = (e: React.ChangeEvent<HTMLInputElement>, layerName: string) => {
    e.preventDefault()

    if (Number(e.target.value) > 1 || Number(e.target.value) < 0) return
    setLayers(prev => {
      let newLayers = [...prev]

      newLayers = newLayers.map(elem => {
        if (elem.layerName === layerName) elem.layerSettings.opacity = Number(e.target.value)
        return elem
      })
      return newLayers
    })
  }

  const handleIsEditingLayer = (layerId: string | undefined) => {
    setIsEditingLayer(prev => {
      if (prev.active) return { active: false }
      else return { active: true, layerId }
    })
  }
  const submitLayerName = (e: React.FormEvent<HTMLFormElement>, lastLayerName: string) => {
    e.preventDefault()

    let newLayers = [...layers]
    const thisLayer = newLayers.find(elem => elem.layerName === lastLayerName)

    // Verificar que no haya una capa con el mismo nombre para evitar problemas de sincronización.
    if ([...newLayers].filter(elem => elem.layerName.toLocaleLowerCase() === newLayerName.toLocaleLowerCase() && elem.id !== thisLayer?.id).length > 0) {
      return setIsEditingLayer({ active: false })
    }

    // Verificar que newLayerName no sea un string vacío.
    if (newLayerName === "") {
      return setIsEditingLayer({ active: false })
    }


    // Actualizar las capas
    newLayers = newLayers.map(currentLayer => {
      if (currentLayer.layerName === lastLayerName) {
        currentLayer.layerName = newLayerName

        currentLayer.keyframes = currentLayer.keyframes.map(currentKeyframe => {
          currentKeyframe.parentLayerName = newLayerName
          return currentKeyframe
        })
      }
      return currentLayer
    })
    setLayers(newLayers)

    // Actualizar los objetos undoStack
    let newUndoStack = [...undoStack]

    newUndoStack = newUndoStack.map(currentUndo => {
      // Actualizar la propiedad layers de undoObj
      currentUndo.layers = currentUndo.layers.map(currentUndoLayer => {
        //Actualizar las capas y buscar la capa que se renombrará
        if (currentUndoLayer.layerName === lastLayerName) {
          currentUndoLayer.layerName = newLayerName

          // Actualizar los keyframes de la capa a actualizar
          currentUndoLayer.keyframes = currentUndoLayer.keyframes.map(currentUndoKeyframe => {
            currentUndoKeyframe.parentLayerName = newLayerName
            return currentUndoKeyframe
          })
        }

        return currentUndoLayer
      })
      // Actualizar la capa seleccionada de undoObj de ser necesario
      if (currentUndo.selectedLayer === lastLayerName) currentUndo.selectedLayer = newLayerName

      return currentUndo
    })

    // Actualizar canvasRefs
    canvasRefs.map(currentRef => {
      if (currentRef.layerName === lastLayerName) {
        currentRef.layerName = newLayerName
      }
      return currentRef
    })

    setSelectedLayer(newLayerName)
    setIsEditingLayer({ active: false })
  }

  function changeLayerLevel(event: "up" | "down", layerId: string) {
    let newLayers = [...layers];
    const layer = newLayers.find(elem => elem.id === layerId);
    if (!layer) return;

    const layerIndex = layer.layerSettings.layerLevel;

    if (event === "up") {
      if (layer.layerSettings.layerLevel < newLayers.length - 1) {
        // Intercambiar los elementos en el array newLayers
        [newLayers[layerIndex], newLayers[layerIndex + 1]] =
          [newLayers[layerIndex + 1], newLayers[layerIndex]];

        // Actualizar la propiedad currentIndex de los objetos en newLayers
        newLayers[layerIndex].layerSettings.layerLevel = layerIndex;
        newLayers[layerIndex + 1].layerSettings.layerLevel = layerIndex + 1;

        // Intercambiar los elementos en el array canvasRefs.current
        [canvasRefs[layerIndex], canvasRefs[layerIndex + 1]] =
          [canvasRefs[layerIndex + 1], canvasRefs[layerIndex]];
      }
    } else {
      if (layerIndex > 0) {
        // Intercambiar los elementos en el array newLayers
        [newLayers[layerIndex], newLayers[layerIndex - 1]] =
          [newLayers[layerIndex - 1], newLayers[layerIndex]];

        // Actualizar la propiedad currentIndex de los objetos en newLayers
        newLayers[layerIndex].layerSettings.layerLevel = layerIndex;
        newLayers[layerIndex - 1].layerSettings.layerLevel = layerIndex - 1;

        // Intercambiar los elementos en el array canvasRefs.current
        [canvasRefs[layerIndex], canvasRefs[layerIndex - 1]] =
          [canvasRefs[layerIndex - 1], canvasRefs[layerIndex]];
      }
    }
    setLayers(newLayers);
    handleNewUndo(selectedLayer, currentFrame, newLayers, "layerPosition")
  }



  useEffect(() => {
    setNewLayerName(selectedLayer)
    setIsEditingLayer({ active: false })
  }, [selectedLayer])

  // Detectar F7 (nuevo fotograma)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F7') {
        handleNewEmptyFrame("empty")
      }
    };

    // Agregar el evento al montar el componente
    window.addEventListener('keydown', handleKeyDown);

    // Limpiar el evento al desmontar el componente
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewEmptyFrame]); // El array vacío asegura que este efecto se ejecute solo una vez



  const [displayMode, setDisplayMode] = useState("undo")
  const undoStackDisplay = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 10, overflow: "hidden", overflowY: "scroll", height: "100%" }}>
        <h3 onClick={() => setDisplayMode(displayMode === "undo" ? "redo" : "undo")}>{displayMode === "undo" ? "Undo" : "Redo"} Stack Display</h3>
        {
          (displayMode === "undo" ? [...undoStack] : [...redoStack]).map((elem, index) =>
              <div key={index} style={{ marginBottom: 15 }}>
                <p>ID: {elem.undoId}</p>
                <p>Type: {elem.undoType || "initialObject"}</p>
                <div>
                  {
                    elem.layers.map((currentLayer, index) => (
                      <div key={index}>
                        <p>{currentLayer.layerName}</p>
                        <div>
                          {
                            currentLayer.keyframes.map((currentKeyframe, index) => (
                              <img
                                style={{
                                  width: 50,
                                  height: 50,
                                  border: "solid black 1px",
                                  marginRight: 5
                                }}
                                key={index}
                                src={currentKeyframe.dataURL}
                              />
                            ))
                          }
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
          )
        }
      </div>
    )
  }


  return (
    <div className="ws-main">
      <div className="ws-file-section panel" style={mediaQueriesStyles}>
        <header className="ws-fs-header">
          <p>File</p>
        </header>
        <div className="ws-fs-body" style={{ height: "500px" }}>
          {undoStackDisplay()}
        </div>
      </div>
      <div className="ws-canvas-section">
        {
          layers.map((currentLayer) => (
            !currentLayer.layerSettings.hidden ?
              <CustomCanvas key={currentLayer.id} layerData={currentLayer} />
              : undefined
          ))
        }
        {
          onionSkin ?
            layers.map((currentLayer) => (
              !currentLayer.layerSettings.hidden && currentLayer.keyframes[currentFrame - 1] ?
                <OnionSkin
                  key={currentLayer.id}
                  zIndex={currentLayer.layerSettings.layerLevel + 10}
                  dataURL={currentLayer.keyframes[currentFrame - 1].dataURL}
                />
                : undefined
            )) : undefined
        }
        <canvas width={400} height={400} className="ws-cs-base" />
      </div>
      <div className="ws-tools-section panel" style={mediaQueriesStyles}>
        <aside className="ws-ts-aside">
          <div className="ws-ts-aside-tools">
            <FaPaintBrush
              className={`${tool === "brush" ? "selected-tool" : ""}`}
              onClick={() => setTool("brush")}
            />
            <FaEraser
              className={`${tool === "eraser" ? "selected-tool" : ""}`}
              onClick={() => setTool("eraser")}
            />
            <IoArrowUndo onClick={handleUndo} />
            <IoArrowRedo onClick={handleRedo} />
          </div>
          <div className="ws-ts-aside-info">
            <div className="ws-ts-aside-info-brush-size">
              <div style={{ width: brushSize / 2 }} />
            </div>
            <div className="ws-ts-aside-info-main-color" style={{ backgroundColor: mainColor }} />
          </div>
        </aside>
        <div className="ws-ts-body">
          <ToolsSectionBody />
        </div>
      </div>
      <div className="ws-layers-section panel" style={mediaQueriesStyles}>
        <header className="ws-ls-header">
          <p>Layers</p>
          <BiLayerPlus onClick={handleNewLayer} />
        </header>
        <aside className="ws-ls-aside">

        </aside>
        <div className="ws-ls-body" ref={layersContainerRef} onScroll={() => handleScroll("container1")}>
          {
            [...layers].reverse().map((elem, index) => (
              <div
                className={`layer ${selectedLayer === elem.layerName ? "selected-layer" : ""}`}
                key={index}
                onClick={() => setSelectedLayer(elem.layerName)}
              >
                {
                  isEditingLayer.active && isEditingLayer.layerId === elem.id ?
                    <form onSubmit={(e) => submitLayerName(e, elem.layerName)}>
                      <input className="layername-input" value={newLayerName} onChange={e => setNewLayerName(e.target.value)} />
                    </form> :
                    <p onDoubleClick={() => handleIsEditingLayer(elem.id)}>
                      {elem.layerName}
                    </p>
                }
                <div className="layer-options">
                  <TiArrowUpThick onClick={() => changeLayerLevel("up", elem.id)} />
                  <TiArrowDownThick onClick={() => changeLayerLevel("down", elem.id)} />
                  <input
                    className="input1 layer-opacity-input"
                    type="number"
                    step={0.01}
                    value={elem.layerSettings.opacity}
                    onChange={e => handleLayerOpacity(e, elem.layerName)}
                    min={0}
                    max={1}
                  />
                  {
                    elem.layerSettings.hidden ?
                      <HiEyeOff onClick={() => handleLayerVisibility(elem.layerName)} />
                      : <HiEye onClick={() => handleLayerVisibility(elem.layerName)} />
                  }
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <div className="ws-timeline-section panel">
        <header className="ws-tls-header">
          <div className="ws-tls-header-1">
            <p className="title">Timeline</p>
            <p className="ws-tls-header-frames-indicator">{currentFrame + 1} / {keyframesLength}</p>
            <div className="ws-tls-header-playback-section">
              <IoPlayBackSharp />
              {
                isPlaying ?
                  <FaStop onClick={handleStop} /> :
                  <FaPlay onClick={handlePlay} />
              }
              <IoPlayForwardSharp />
            </div>
            <ImLoop 
            className={isLoop ? "ws-tls-header-loop-option-active" : "ws-tls-header-loop-option"}
            onClick={() => setIsLoop(!isLoop)}
            />
          </div>
          <label className="ws-tls-header-2">
            <input
              className="input1"
              type="number"
              value={frameRate}
              onChange={e => setFrameRate(Number(e.target.value))}
            />/s
          </label>
          <div className="ws-tls-header-options">
            {
              onionSkin ?
                <TbLayersSelected style={{ marginRight: 30 }} onClick={() => setOnionSkin(!onionSkin)} />
                : <TbLayersOff style={{ marginRight: 30 }} onClick={() => setOnionSkin(!onionSkin)} />
            }
            <TbDeviceTabletPlus onClick={() => handleNewEmptyFrame("empty")} />
            <TbDeviceIpadHorizontalPlus onClick={() => handleNewEmptyFrame("clone")} />
          </div>
        </header>
        <aside className="ws-tls-nav">
          {
            frameIndexGenerator
          }
        </aside>
        <div className="ws-tls-body" ref={timelineContainerRef} onScroll={() => handleScroll("container2")}>
          {
            [...layers].reverse().map((currentLayer) => (
              <div
                className={`keyframes-container ${selectedLayer === currentLayer.layerName ? "selected-layer" : ""}`}
                key={currentLayer.layerName}
              >
                {
                  currentLayer.keyframes.map((currentKeyframe, index) => (
                    <div
                      className="keyframe"
                      key={index}
                      onClick={() => {
                        handleKeyframeClick(index, currentLayer.layerName)
                      }}
                    >
                      <div className={`keyframe-state ${currentKeyframe.state === "filled" ? "keyframe-state-filled" : ""}`} />
                    </div>
                  ))
                }
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}