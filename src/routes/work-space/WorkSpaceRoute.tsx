import { useResolution } from "../../custom-hooks/useResolutions"
import "../../stylesheets/routes/work-space/WorkSpaceRoute.css"

import { FaPaintBrush, FaEraser } from "react-icons/fa";
import { IoArrowUndo, IoArrowRedo } from "react-icons/io5";
import { BiLayerPlus } from "react-icons/bi";


import { CustomCanvas } from "./CustomCanvas";
import { useContext } from "react";
import { DataContext, createLayer, createUndoObj, undoStackObject } from "../../contexts/DataContext";
import { nanoid } from "nanoid";
import { ToolsSectionBody } from "./ToolsSectionBody";
import { TbDeviceIpadHorizontalPlus, TbDeviceTabletPlus } from "react-icons/tb";






export const WorkSpaceRoute = () => {
  const { windowWidth } = useResolution()

  const contextValues = useContext(DataContext)
  if (!contextValues) throw new Error("useContext must be inside a DataProvider")
  const {
    tool,
    brushSize,
    setTool,
    mainColor,
    setLayersUndoStacks,
    setMainUndoStack,
    mainUndoStack,
    layersUndoStacks,
    redoStack,
    handleUndo,
    handleRedo,
    layers,
    setLayers,
    selectedLayer,
    setSelectedLayer,
    handleNewEmptyFrame,
    currentFrame,
    setCurrentFrame,
    keyframesLength
  } = contextValues

  const mediaQueriesStyles = {
    display: windowWidth <= 768 ? "none" : "flex"
  }





  const drawUndos = () => {
    return (
      <div style={{height: "100%"}}>
        <div style={{ overflow: "hidden", overflowY: "scroll", height: "50%" }}>
          <h1 style={{position: "sticky", top: "0"}}>Main Undo Stack</h1>
          {
            mainUndoStack.reverse().map(elem => (
              <div>
                <p>id: {elem.undoObjId}</p>
                <p>type: {elem.undoType}</p>
                <img src={elem.canvasDataURL} width={100} height={100} />
              </div>
            ))
          }
        </div>
        <div style={{ overflow: "hidden", overflowY: "scroll", height: "50%" }}>
          <h1 style={{position: "sticky", top: "0"}}>Main Redo Stack</h1>
          {
            redoStack.reverse().map(elem => (
              <div>
                <p>id: {elem.undoObjId}</p>
                <p>type: {elem.undoType}</p>
                <img src={elem.canvasDataURL} width={100} height={100} />
              </div>
            ))
          }
        </div>
      </div>
    )
  }



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
    const newLayerName = `Layer_` + (layers.length).toString()
    const newLayer = createLayer(newLayerName, layers.length - 1)
    setLayers(prev => [...prev, newLayer])


    const newLayerData = {
      layerName: newLayerName,
      layerSettings: newLayer.layerSettings,
      keyframes: newLayer.keyframes
    }
    const newUndoObject: undoStackObject = createUndoObj("newLayer", newLayerData, undefined, newLayerName, nanoid())


    // Agregar el objeto a la linea principal de acciones (mainUndoStack)
    setMainUndoStack((prev: undoStackObject[]) => {
      return [...prev, newUndoObject]
    })

    // Agregar el objeto a la linea secundaria de acciones (layersUndoStacks)
    setLayersUndoStacks(prevState => ({
      ...prevState,
      [newLayerName]: prevState[newLayerName] ? [...prevState[newLayerName], newUndoObject] : [newUndoObject]
    }));


    setSelectedLayer(newLayerName)
  }





  return (
    <div className="ws-main">
      <div className="ws-file-section panel" style={mediaQueriesStyles}>
        <header className="ws-fs-header">
          <p>File</p>
        </header>
        <div className="ws-fs-body" style={{ height: "500px" }}>
          {drawUndos()}
        </div>
      </div>
      <div className="ws-canvas-section panel">
        {
          layers.map((currentLayer, index) => (
            <CustomCanvas key={index} layerName={currentLayer.layerName} />
          ))
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
        <div className="ws-ls-body">
          {
            [...layers].reverse().map((elem, index) => (
              <div
                className={`layer ${selectedLayer === elem.layerName ? "selected-layer" : ""}`}
                key={index}
                onClick={() => setSelectedLayer(elem.layerName)}
              >
                <p>{elem.layerName}</p>
              </div>
            ))
          }
        </div>
      </div>
      <div className="ws-timeline-section panel">
        <header className="ws-tls-header">
          <p>Timeline</p>
          <div className="ws-tls-header-options">
            <TbDeviceTabletPlus onClick={handleNewEmptyFrame} />
            <TbDeviceIpadHorizontalPlus />
          </div>
        </header>
        <aside className="ws-tls-nav">
          {
            frameIndexGenerator
          }
        </aside>
        <div className="ws-tls-body">
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
                      onClick={() => handleKeyframeClick(index, currentLayer.layerName)}
                    >
                      <div className={`keyframe-state ${currentKeyframe.state === "filled" ? "keyframe-state-filled" : ""}`} />
                      {
                        currentKeyframe.state === "filled" ? "f" : "e"
                      }
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