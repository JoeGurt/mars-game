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

//TODO: Select grid area
var gridArea = {
    "min": {
        "x": -96,
        "y": -96
    },
    "max": {
        "x": 160,
        "y": 160
    }
};

var canvas, width, height;

function createGridCanvas() {
    height = gridArea.max.y - gridArea.min.y;
    width = gridArea.max.x - gridArea.min.x;
    canvas = document.createElement( "CANVAS" );
    canvas.id = "gridCanvas";
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild( canvas );
    var context = canvas.getContext( "2d" );
    var imageData = context.getImageData( 0, 0, width, height );
    for ( var i = 3; i < imageData.data.length; i += 4 ) {
        imageData.data[ i ] = 255;
    }
    context.putImageData( imageData, 0, 0 );
    vwf_view.kernel.callMethod( tilemapToolID, "setTileMapUniforms",
        [ canvas.id, [ gridArea.min.x, gridArea.min.y ], [ width, height ] ] );
}

function toggleGridPixel( x, y ) {
    var mapX = x - gridArea.min.x;
    var mapY = gridArea.max.y - 1 - y;
    if ( mapX >= 0 && mapX < width && mapY >= 0 && mapY < height ) {
        var context = canvas.getContext( "2d" );
        var imageData = context.getImageData( mapX, mapY, 1, 1 );
        imageData.data[ 0 ] = Boolean( imageData.data[ 0 ] ) ? 0 : 255;
        imageData.data[ 1 ] = Boolean( imageData.data[ 1 ] ) ? 0 : 255;
        imageData.data[ 2 ] = Boolean( imageData.data[ 2 ] ) ? 0 : 255;
        context.putImageData( imageData, mapX, mapY );
    } else {
        console.log( "Grid Coordinate ( " + x + ", " + y + " ) is "
            + "outside the grid area." );
    }
    vwf_view.kernel.callMethod( tilemapToolID, "updateTexture" );
}

function saveTileMap() {
    var imageData = canvas.toDataURL( "image/png" );
    document.location.href = imageData.replace( "image/png", "image/octet-stream" );
}

//@ sourceURL=editor/view/tilemapTool.js