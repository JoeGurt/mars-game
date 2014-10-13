// Copyright 2014 Lockheed Martin Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may 
// not use this file except in compliance with the License. You may obtain 
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and 
// limitations under the License.

this.objCount = 0;
this.selectedObject;
this.createdObjects = {};

var lastPointerPosition, lastPointerDownTime, lastPointerDownID, tileHeight;
var ORIGIN_COLOR = [ 220, 220, 255 ];
var PASSABLE_COLOR = [ 220, 255, 220 ];
var IMPASSABLE_COLOR = [ 255, 220, 220 ];
var OPACITY = 0.25;
var NORMAL = [ 0, 0, 1 ];
var ROTATION = 90;
var RENDERTOP = true;
var SIZE = 0.9;

this.initialize = function() {
    this.camera.transform = [
        -0.6877578496932983,0.7259325385093689,2.705990027607186e-7,0,
        -0.6843284964561462,-0.6483430862426758,-0.3336801826953888,0,
        -0.24222907423973083,-0.2294914275407791,0.9426885843276978,0,
        100,100.00012969970703,50.0000114440918,1
    ];

    this.camera.far = 10000;

    this.future( 0 ).onSceneReady();
}

this.onSceneReady = function() {
    this.setUpListeners();
    var json = JSON.stringify( this.scenarioGenerator.scenarios );
    this.scenariosLoaded( json );
}

this.setUpListeners = function() {
    var scene = this;

    this.editTool.grid.gridUpdated = function() {
        scene.updateEditToolTiles();
    }
}

this.compileLevel = function() {
    var level = new Array();
    var keys, node;
    level.push( "scene" );
    level.push( JSON.stringify( {
        "enableShadows": this.enableShadows,
        "ambientColor": this.ambientColor,
        "timeOfDay": this.timeOfDay } ) );
    level.push( "sunLight" );
    level.push( JSON.stringify(
        getNodeProperties( this.sunLight ) ) );
    level.push( "envLight" );
    level.push( JSON.stringify(
        getNodeProperties( this.envLight ) ) );
    keys = Object.keys( this.createdObjects );
    for ( var i = 0; i < keys.length; i++ ) {
        level.push( keys[ i ] );
        node = this.createdObjects[ keys[ i ] ];
        node.properties = getNodeProperties( this[ keys[ i ] ] );
        level.push( JSON.stringify( node ) );
    }
    level.push( "scenarios" );
    node = this.scenarioGenerator.scenarios;
    level.push( JSON.stringify( node ) );
    this.levelCompiled( level );
}

this.createLevelFromFile = function( levelArray ) {
    var name, obj, keys;
    var callback = function( object ) {
        var translation = object.translation;
        if ( object.currentGridSquare ) {
            this.grid.addToGrid( object );
        } else {
            this.grid.addToGridFromWorld( object, object.translation );
        }
        object.translateTo( translation );
    }
    for ( var i = 0; i < levelArray.length; i++ ) {
        name = levelArray[ i ];
        obj = JSON.parse( levelArray[ ++i ] );
        if ( name === "scene" || name === "sunLight" || name === "envLight" ) {
            keys = Object.keys( obj );
            for ( var n = 0; n < keys.length; n++ ) {
                this[ keys[ n ] ] = obj[ keys[ n ] ];
            }
        } else if ( name === "scenarios" ) {
            this.scenarioGenerator.scenarios = obj;
        } else {
            if ( name !== "map" ) {
                obj[ "implements" ] = "editor/editable.vwf";
                obj.properties[ "nameString" ] = name;
                this.children.create( name, obj, callback );
            } else {
                this.children.create( name, obj );
            }
            this.objectCreated( name, obj );
        }
    }
}

function getNodeProperties( node ) {
    var properties = {};
    var keys = Object.keys( node.properties );
    for ( var i = 0; i < keys.length; i++ ) {
        properties[ keys[ i ] ] = node.properties[ keys[ i ] ];
    }
    return properties;
}

this.setTimeOfDay = function( hour ) {
    var angle = ( hour / 24 * 360 ) - 90;
    angle = ( angle % 360 + 360 ) % 360;
    var radians = angle * Math.PI / 180;
    var x = Math.cos( radians );
    var z = Math.sin( radians );
    var red, green, blue;
    var intensity;
    this.sunLight.translateTo( [ x, 0, z ] );
    red = 130 + Math.max( z, 0 ) * 125;
    green = 80 + Math.max( z, 0 ) * 100;
    blue = Math.max( z, 0 ) * 90 + Math.max( ( x - 1 ) / -2, 0 ) * 90;
    this.sunLight.color = [ red, green, blue ];
    intensity = Math.max( z + 0.75 / 1.75, 0 );
    this.sunLight.intensity = intensity * 0.7;
    this.envLight.intensity = intensity * 0.25;
    this.ambientColor = [ 
        red * intensity + 75,
        green * intensity + 75,
        blue * intensity + 75 ];
    this.sunLight.shadowDarkness = intensity / 0.7 * 0.3;
    this.timeSet( hour );
}

this.updateEditToolTiles = function() {
    var grid = this.editTool.grid;
    var origin, color;
    var tiles = new Array;

    var offset = new Array(); 
    offset.push( grid.gridOriginInSpace[ 0 ] / grid.gridSquareLength );
    offset.push( grid.gridOriginInSpace[ 1 ] / grid.gridSquareLength );

    for ( var x = 0; x < grid.boundaryValues.length; x++ ) {

        for ( var y = 0; y < grid.boundaryValues[ x ].length; y++ ) {
            origin = [
                offset[ 0 ] + ( x ),
                offset[ 1 ] + ( y ),
                0
            ];

            if ( x === 0 && y === 0 ) {
                color = ORIGIN_COLOR;
            } else {
                color = grid.boundaryValues[ x ][ y ] === -1 ? IMPASSABLE_COLOR : PASSABLE_COLOR;
            }

            tiles.push( { 
                "plane": {
                "origin": origin,
                "normal": NORMAL,
                "rotationAngle": ROTATION,
                "size": SIZE,
                "color": color,
                "opacity": OPACITY,
                "doubleSided": false,
                "renderTop": RENDERTOP
            } } );
        }
    }

    this.graph.editToolTiles.graphObjects = tiles;
    this.graph.editToolTiles.groupVisible = true;
}

this.hideEditToolTiles = function() {
    this.graph.editToolTiles.groupVisible = false;
}

this.createGridDisplay = function( grid ) {
    var origin, color;
    var tiles = new Array();
    var offset = new Array(); 
    offset.push( grid.gridOriginInSpace[ 0 ] / grid.gridSquareLength );
    offset.push( grid.gridOriginInSpace[ 1 ] / grid.gridSquareLength );

    for ( var x = 0; x < grid.boundaryValues.length; x++ ) {
        for ( var y = 0; y < grid.boundaryValues[ x ].length; y++ ) {
            origin = [
                offset[ 0 ] + ( x ),
                offset[ 1 ] + ( y ),
                0
            ];

            color = grid.boundaryValues[ x ][ y ] === -1 ? IMPASSABLE_COLOR : PASSABLE_COLOR;

            tiles.push( { 
                "plane": {
                "origin": origin,
                "normal": NORMAL,
                "rotationAngle": ROTATION,
                "size": SIZE,
                "color": color,
                "opacity": OPACITY,
                "doubleSided": false,
                "renderTop": RENDERTOP
            } } );
        }
    }

    this.graph.mapTiles.graphObjects = tiles;
}

this.removeGridDisplay = function() {
    var graph = this.graph;

    for ( var obj in graph.children ) {
        graph.children.delete( graph.children[ obj ] );
    }
}

this.clearLevel = function() {
    this.deleteMap();
    var keys = Object.keys( this.createdObjects );
    for ( var i = 0; i < keys.length; i++ ) {
        this.deleteObject( this[ keys[ i ] ].id );
    }
    this.createdObjects = {};
}

this.loadMap = function( path ) {
    this.deleteMap();
    this.future( 0 ).createObject( "map", path );
}

this.deleteMap = function() {
    if ( this.map ) {
        this.children.delete( this.map );
        delete this.createdObjects[ "map" ];
        this.objectDeleted( "map" );
    }
}

this.loadObject = function( path, name ) {
    if ( this.selectedObject !== undefined ) {
        this.deselectObject();
    }

    var objectName = "object_" + this.objCount++;
    var callback = function( object ) {
        this.grid.addToGridFromWorld( object, [ 0, 0, 0 ] );
    }

    this.future( 0 ).createObject( objectName, path, name, callback );
}

this.deleteObject = function( objectID ) {
    var object = this.findByID( this, objectID );
    if ( object !== undefined ) {
        if ( this.selectedObject && object.id === this.selectedObject.id ) {
            this.deselectObject();
        }
        this.objectDeleted( object.name );
        this.children.delete( object );
    }
}

this.createObject = function( objName, path, name, callback ) {
    var objDef = {
        "extends": path,
        "properties": {
            "castShadows": true,
            "receiveShadows": true
        }
    }

    this.objectCreated( objName, objDef );

    if ( objName !== "map" ) {
        objDef[ "implements" ] = "editor/editable.vwf";
        objDef.properties[ "nameString" ] = name;
    }

    this.children.create( objName, objDef, callback );
}

this.objectCreated = function( name, obj ) {
    var objCopy = JSON.parse( JSON.stringify( obj ) );
    this.createdObjects[ name ] = objCopy;
}

this.setActiveTool = function( toolID ) {
    this.activeTool = toolID;
}

this.useTool = function( eventType, pointerInfo, pickInfo ) {
    switch ( this.activeTool ) {
        case "camera":
            if ( eventType === "pointerClick" && pointerInfo.button === "left" ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.selectObject( object );
                } else {
                    this.deselectObject();
                }
            }
            break;
        case "translate":
            if ( eventType === "pointerDown" && pointerInfo.buttons.left ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.selectObject( object );
                }
                if ( this.selectedObject ) {
                    lastPointerPosition = pointerInfo.screenPosition;
                }
            } else if ( eventType === "pointerMove" && pointerInfo.buttons.left && this.selectedObject ) {
                if ( lastPointerPosition[ 0 ] !== pointerInfo.screenPosition[ 0 ] ||
                     lastPointerPosition[ 1 ] !== pointerInfo.screenPosition[ 1 ] ) {
                    this.drag( pickInfo );
                    lastPointerPosition = pointerInfo.screenPosition;
                }
            } else if ( eventType === "pointerUp" && this.selectedObject ) {
                this.deselectObject();
            }
            break;
        case "rotate":
            if ( eventType === "pointerDown" && pointerInfo.buttons.left && this.selectedObject ) {
                if ( this.selectedObject.isOnGrid ) {
                    lastPointerPosition = pointerInfo.position[ 0 ];
                }
            } else if ( eventType === "pointerMove" && pointerInfo.buttons.left && this.selectedObject ) {
                if ( this.selectedObject.isOnGrid ) {
                    var delta = pointerInfo.position[ 0 ] - lastPointerPosition;
                    if ( delta > 0.05 || delta < -0.05 ) {
                        this.selectedObject.rotateObstacle( delta );
                        this.grid.removeFromGrid( this.selectedObject, 
                            this.selectedObject.currentGridSquare );
                        this.grid.addToGridFromCoord( this.selectedObject, 
                            this.selectedObject.currentGridSquare );
                        this.editTool.grid.updateGrid( this.selectedObject );
                        lastPointerPosition = pointerInfo.position[ 0 ];
                    }
                }
            } else if ( eventType === "pointerUp" ) {
                lastPointerPosition = undefined;
            } else if ( eventType === "pointerClick" && pointerInfo.button === "left" ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.selectObject( object );
                } else {
                    this.deselectObject();
                }
            }
            break;
        case "raise_lower":
            if ( eventType === "pointerDown" && pointerInfo.buttons.left && this.selectedObject ) {
                if ( this.selectedObject.isOnGrid ) {
                    if ( this.map ) {
                        var origin = this.selectedObject.translation;
                        origin[ 2 ] += 15;
                        var picks = this.raycast( origin, [ 0, 0, -1 ], 0, Infinity, true, this.map );
                        if ( picks[ 0 ] ) {
                            tileHeight = picks[ 0 ].point.z;
                        } else {
                            tileHeight = 0;
                        }
                    } else {
                        tileHeight = 0;
                    }
                    lastPointerPosition = pointerInfo.position[ 1 ];
                }
            } else if ( eventType === "pointerMove" && pointerInfo.buttons.left && this.selectedObject ) {
                if ( this.selectedObject.isOnGrid && !isNaN( tileHeight ) ) {
                    var cameraPos = new THREE.Vector3(
                            this.camera.worldTransform[ 12 ],
                            this.camera.worldTransform[ 13 ],
                            this.camera.worldTransform[ 14 ]
                        );
                    var targetPos = new THREE.Vector3(
                            this.selectedObject.worldTransform[ 12 ],
                            this.selectedObject.worldTransform[ 13 ],
                            this.selectedObject.worldTransform[ 14 ]
                        );
                    var height = cameraPos.distanceTo( targetPos );
                    var delta = ( pointerInfo.position[ 1 ] - lastPointerPosition ) / 1.5;
                    var trans = this.selectedObject.translation;
                    var adj = trans[ 2 ] - ( height * delta );
                    this.selectedObject.translateTo( [ trans[ 0 ], trans[ 1 ], adj ] );
                    lastPointerPosition = pointerInfo.position[ 1 ];
                }
            } else if ( eventType === "pointerUp" ) {
                tileHeight = undefined;
                lastPointerPosition = undefined;
            } else if ( eventType === "pointerClick" && pointerInfo.button === "left" ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.selectObject( object );
                } else {
                    this.deselectObject();
                }
            }
            break;
        case "delete":
            if ( eventType === "pointerClick" && pointerInfo.button === "left" ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.requestDelete( object.id, object.nameString );
                } else {
                    this.deselectObject();
                }
            }
            break;
        default:
            if ( eventType === "pointerClick" && pointerInfo.button === "left" ) {
                var object = this.findByID( this, pickInfo.pickID );
                if ( object && object.isEditable ) {
                    this.selectObject( object );
                } else {
                    this.deselectObject();
                }
            }
            break;
    }
}

this.drag = function( pickInfo ) {
    this.selectedObject.terrainName = this.map ? this.map.name : undefined;
    var coord, curCoord, origin, normal, intersects, nearest, point, factor;

    if ( pickInfo.pickID && pickInfo.pickID !== this.selectedObject.id ) {
        coord = this.grid.getGridFromWorld( pickInfo.globalPosition );
    } else {
        origin = pickInfo.globalSource;
        normal = pickInfo.pointerVector;
        if ( origin && normal ) {
            if ( this.map ) {
                intersects = this.raycast( origin, normal, 0, Infinity, true, this.map );
                nearest = findNearestOther( this.selectedObject, intersects );
                if ( nearest ) {
                    point = [
                        nearest.point.x,
                        nearest.point.y,
                        nearest.point.z
                    ];
                    coord = this.grid.getGridFromWorld( point );
                }
            } else {
                factor = -origin[ 2 ] / normal[ 2 ];
                point = [
                    origin[ 0 ] + ( factor * normal[ 0 ] ),
                    origin[ 1 ] + ( factor * normal[ 1 ] ),
                    origin[ 2 ] + ( factor * normal[ 2 ] )
                ];
                coord = this.grid.getGridFromWorld( point );
            }
        }
    }

    coord = coord || this.selectedObject.currentGridSquare;

    curCoord = this.selectedObject.currentGridSquare;

    if ( coord[ 0 ] === curCoord[ 0 ] && coord[ 1 ] === curCoord[ 1 ] ) {
        return;
    }

    if ( this.selectedObject.isOnGrid ) {
        this.grid.removeFromGrid( this.selectedObject, this.selectedObject.currentGridSquare );
    }

    this.grid.addToGridFromCoord( this.selectedObject, coord );
    this.editTool.grid.moveGridOrigin( coord );
}

this.stopDrag = function( pointerInfo, pickInfo ) {
    if ( !this.selectedObject ) {
        return;
    }

    this.selectedObject = undefined;
}

this.selectObject = function( object ) {
    if ( this.editTool.selectedObjectId === object.id ) {
        this.deselectObject();
    } else {
        this.editTool.grid.updateGrid( object );
        this.editTool.selectedObjectId = object.id;
        this.selectedObject = object;
    }
}

this.deselectObject = function() {
    this.hideEditToolTiles();
    this.editTool.selectedObjectId = undefined;
    this.selectedObject = undefined;
}

this.pointerOver = function( pointerInfo, pickInfo ) {
    if ( pickInfo.pickID !== lastPointerDownID ) {
        lastPointerDownID = undefined;
        lastPointerDownTime = undefined;
    }
    this.useTool( "pointerOver", pointerInfo, pickInfo );
}

this.pointerOut = function( pointerInfo, pickInfo ) {
    lastPointerDownID = undefined;
    lastPointerDownTime = undefined;
    this.useTool( "pointerOut", pointerInfo, pickInfo );
}

this.pointerDown = function( pointerInfo, pickInfo ) {
    lastPointerDownID = pickInfo.pickID;
    lastPointerDownTime = vwf_view.kernel.time();
    this.useTool( "pointerDown", pointerInfo, pickInfo );
}

this.pointerUp = function( pointerInfo, pickInfo ) {
    this.useTool( "pointerUp", pointerInfo, pickInfo );
}

this.pointerClick = function( pointerInfo, pickInfo ) {
    var time = vwf_view.kernel.time();
    if ( lastPointerDownID && time - lastPointerDownTime < 0.25 ) {
        this.useTool( "pointerClick", pointerInfo, pickInfo );
    }
}

this.pointerMove = function( pointerInfo, pickInfo ) {
    if ( pickInfo.pickID !== lastPointerDownID ) {
        lastPointerDownID = undefined;
        lastPointerDownTime = undefined;
    }
    this.useTool( "pointerMove", pointerInfo, pickInfo );
}

function findNearestOther( dragObj, picks ) {
    for ( var i = 0; i < picks.length; i++ ) {
        var pickID = findNodeID( picks[ i ].object );
        if ( pickID !== dragObj.id ) {
            return picks[ i ];
        }
    }

    return undefined;
}

function findNodeID( object ) {
    var id = undefined;

    while ( !id && object ) {
        if ( object.vwfID ) {
            id = object.vwfID;
        } else {
            object = object.parent;
        }
    }

    return id;
}

this.addNewScenario = function( json, name ) {
    this.scenarioGenerator.scenarios = json.scenarios;
    this.scenarioGenerator.createScenario( name );
    var scenarios = JSON.stringify( this.scenarioGenerator.scenarios );
    this.scenariosLoaded( scenarios );
}

this.saveScenarios = function( json ) {
    this.scenarioGenerator.scenarios = json.scenarios;
}

//@ sourceURL=editor/scene.js