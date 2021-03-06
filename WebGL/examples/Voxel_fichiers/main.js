
// Elements
var camera, scene, renderer;
var textureCamera, planeScreen, finalRenderTarget, uniformsRender;
var controls, clock, projector;
var INTERSECTED;
var mouse = { x:0, y:0 };
var mouseDown = false;
var viewHalfX, viewHalfY;

// Voxels
var LOD_COUNT = 4;
var voxelsMesh = [];
var VOXEL_SIZE = 1;
var GRID_SIZE = 8;
var ERASE_MODE = false;

var lines = [];

var gameObjects = [];
var monkey;

// Paint mode
var brushThickness = 0.2; // [0.01 ... 1.0]

// Timing
var delayIteration = 0.1;
var lastIteration = -delayIteration;

// Consts
var distMax = VOXEL_SIZE * 2;
var distMin = VOXEL_SIZE * 0.75;
var moveSpeed = 80;
var lookSpeed = 30;
var textureCameraDistance = 400;

// Debug cube
var debug;

init();
render();

$( document ).ready(function() {
	
	$( "#pen_plus" ).click(function() {
		if (parseFloat(document.getElementById("pen_size").value) < 1.0) {
			var val = parseFloat(document.getElementById("pen_size").value) + 0.02;
			document.getElementById("pen_size").value = val.toFixed(2);
			brushThickness = val.toFixed(2);
		}
	});
	
	$( "#pen_minus" ).click(function() {
		if (parseFloat(document.getElementById("pen_size").value) > 0.0) {
			var val = parseFloat(document.getElementById("pen_size").value) - 0.02;
			document.getElementById("pen_size").value = val.toFixed(2);
			brushThickness = val.toFixed(2);
		}
	});
	
	$( "#erase_mode" ).click(function() {
	  ERASE_MODE = document.getElementById("erase_mode").checked;
	  if (ERASE_MODE) console.log("Erase mode activated !");
	});
});

function init()
{
	clock = new THREE.Clock();
	viewHalfX = window.innerWidth / 2;
	viewHalfY = window.innerHeight / 2;
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 75, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;

	// initialize object to perform world/screen calculations
	projector = new THREE.Projector();

	// Setup Render
	renderer = new THREE.WebGLRenderer({ antialias:true, alpha: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	// Setup Scene 
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x050505, 2000, 3500 );

	// Lights
	scene.add( new THREE.AmbientLight( 0x444444 ) );
	var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
	light1.position.set( -0.3, 0.3, 0.3 );
	scene.add( light1 );
	var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
	light2.position.set( 0.3, 0.3, -0.3 );
	scene.add( light2 );

	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
	camera.position = new THREE.Vector3(10, 10, 10);
	scene.add(camera);

	// Control Camera 1
	controls = new THREE.FirstPersonControls(camera);
	controls.movementSpeed = moveSpeed;
	controls.lookSpeed = lookSpeed;
	controls.lookVertical = true;
	controls.mouseDragOn = true;
	controls.lon = -90;

	// Render to Texture
	finalRenderTarget = new THREE.WebGLRenderTarget( 1024, 1024, { format: THREE.RGBAFormat, alpha: true } );
	// Shaders
	var vertexShader = document.getElementById( 'vertexRender' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentRender' ).textContent;
	var textureShader = THREE.ImageUtils.loadTexture( "textures/hoho.jpg" );
	textureShader.magFilter = THREE.NearestFilter;
	uniformsRender = {
		texture: { type: "t", value: textureShader  },
		transitionAlpha : { type: "f", value: 0.0} };
	// Diplay Rendered Texture on Screen with a Plane
	var planeSize = 1.5;
	var planeGeometry = new THREE.PlaneGeometry(ASPECT * planeSize, planeSize);
	var planeMaterial = new THREE.ShaderMaterial( { uniforms: uniformsRender, attributes: {}, vertexShader: vertexShader, fragmentShader: fragmentShader, antialias:false } );
	planeMaterial.transparent = true;
	planeScreen = new THREE.Mesh( planeGeometry, planeMaterial );
	planeScreen.position.z = -1.0;

	// Camera used for Rendered Texture
	textureCamera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
	textureCamera.position = new THREE.Vector3(0, 0, textureCameraDistance);
	textureCamera.lookAt(new THREE.Vector3(0,0,0));

	camera.add(planeScreen);
	camera.add(textureCamera);

	// Load Mesh
	var loader = new THREE.OBJLoader();
	loader.load( 'obj/mesh.wavefront', function ( object ) {
		object.traverse( function ( child ) {
			// Find mesh in object
			if ( child instanceof THREE.Mesh ) {

				var filled = new GameObject();
				filled.initWithMesh(child, 0.5);
				filled.moveTo({x:-120, y:0, z:120});
				filled.rotateTo({x:0, y:2.4, z:0})
				filled.scale = 4;
				filled.fillVoxels();
				filled.cleanVoxels();
				filled.updateParticleSystem();

				// 
				for (var i = 0; i < 4; i++) {
					var obj = new GameObject();
					obj.initWithMesh(child, 1);
					obj.moveTo({x:i * 100, y:30, z:-100});
					gameObjects.push(obj);
				}

				//
				gameObjects[0].setSizeFactor(1);
				gameObjects[0].scale = 1;
				gameObjects[0].areaNear = 100;
				gameObjects[0].areaFar = 200;

				//
				gameObjects[1].setSizeFactor(4);
				gameObjects[1].scale = 8;
				gameObjects[1].areaNear = 60;
				gameObjects[1].areaFar = 120;
				gameObjects[1].blackAndWhite = false;

				//
				gameObjects[2].setSizeFactor(2);
				gameObjects[2].scale = 4;
				gameObjects[2].areaNear = 80;
				gameObjects[2].areaFar = 160;
				gameObjects[2].color = new THREE.Color(0.15, 0.6, 0.3);

				//
				gameObjects[3].areaNear = 150;
				gameObjects[3].areaFar = 200;
				gameObjects[3].blackAndWhite = false;

				var high = new GameObject();
				high.color = new THREE.Color(0.5, 0, 0.5);
				high.initWithMesh(child, 2, 1);
				high.moveTo({x:-100, y:0, z:-100});
				high.rotateTo({x:0, y:0.8, z:0})
				high.updateParticleSystem();
				high.areaNear = 200;
				high.areaFar = 210;
				gameObjects.push(high);


				var cubed = new GameObject();
				cubed.initWithMeshWithCubes(child, 0.5, 1);
				cubed.moveTo({x:0, y:20, z:0});
			}
		});
	});

	// WC
	var loader = new THREE.OBJLoader();
	loader.load( 'obj/wc.wavefront', function ( object ) {
		object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				var obj = new GameObject();
				obj.sizeFactor = 2;
				obj.scale = 4;
				obj.color = new THREE.Color(0, 0.5, 0.5);
				obj.initWithMesh(child, 1);
				obj.moveTo({x:0, y:0, z:100});
				obj.rotateTo({x:0, y:3.14, z:0})
			}
		});
	});

	// Head
	var loader = new THREE.OBJLoader();
	loader.load( 'obj/head.wavefront', function ( object ) {
		object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {

				var obj = new GameObject();
				obj.sizeFactor = 3;
				obj.scale = 4;
				obj.initWithMesh(child, 4);
				obj.moveTo({x:0, y:100, z:-400});


				var obj = new GameObject();
				obj.sizeFactor = 2;
				obj.scale = 4;
				obj.initWithMesh(child, 2);
				obj.moveTo({x:150, y:100, z:-400});
				//obj.rotateTo({x:0, y:3.14, z:0})


				var obj = new GameObject();
				obj.sizeFactor = 2;
				obj.scale = 4;
				obj.initWithMesh(child, 1);
				obj.moveTo({x:300, y:100, z:-400});
			}
		});
	});

	// Ground
	var loader = new THREE.OBJLoader();
	loader.load( 'obj/ground.wavefront', function ( object ) {
		object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				var obj = new GameObject();
				obj.sizeFactor = 3;
				obj.scale = 10;
				obj.initWithMesh(child, 0.25);
				obj.moveTo({x:0, y:-100, z:0});
			}
		});
	});

	// Debug
	debug = CreateCubeWired(new THREE.Vector3());

	var axisX = CreateCubeWired(new THREE.Vector3());
	axisX.scale.set(1000, 1, 1);
	var axisY = CreateCubeWired(new THREE.Vector3());
	axisY.scale.set(1, 1000, 1);
	var axisZ = CreateCubeWired(new THREE.Vector3());
	axisZ.scale.set(1, 1, 1000);
}

function render()
{
	requestAnimationFrame(render);

	controls.update(clock.getDelta());

	update();

	renderer.render(scene, camera);
}

function update()
{

	// Behaviors
	if (lastIteration + delayIteration < clock.getElapsedTime())
	{
		lastIteration = clock.getElapsedTime();
		//monkey.moveTo({x:0, y:0, z:oscillo * 100});
		//monkey.rotateTo({x:oscillo * 3.14, y:0, z:0});
		//monkey.updateParticleSystem(oscillo);

		if (mouseDown && ERASE_MODE) {
			paint();
		}
/*
		if (meshLoaded != undefined) {
			voxelsMesh = getVoxelsFromMesh(meshLoaded.geometry.vertices, meshLoaded.geometry.faces, oscillo);
			//scene.remove(particleSystem);
			updateParticleSystem(4 - (Math.cos(clock.getElapsedTime()) + 1) * 2);
		}
		*/
	}

	//var distancePlayer = distance(monkey.position, camera.position);//monkey.nearestVoxelFrom(camera.position);
	//var scale = Math.max(0, (100 - distancePlayer) / 10);
	for (var i = 0; i < gameObjects.length; i++) {
		var gameObject = gameObjects[i];
		gameObject.updateParticleSystem(camera.position);
		if (i == 2) {
			gameObject.rotateTo({x:0, y:clock.getElapsedTime()  % 6.28, z:Math.cos(clock.getElapsedTime() * 2) * 0.1});
		} else if (i == 3) {
			gameObject.rotateTo({x:clock.getElapsedTime() % 6.28, y:clock.getElapsedTime() % 6.28, z:0});
			var oscillo = Math.cos(clock.getElapsedTime()) * 100;
			gameObject.moveTo({x:gameObject.position.x, y:0, z:oscillo});
		}
	}
/*
*/
}

function mousemove( event )
{
	mouse = { x:event.pageX - viewHalfX, y:event.pageY - viewHalfY };
}

function mousedown(event)
{
	mouseDown = true;
}

function mouseup(event)
{
	mouseDown = false;
}

function paint ()
{
	var dist = 20;
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	projector.unprojectVector( vector, camera );
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() ).ray;
	//var step = 3;
	
	var cursor = { 	x: camera.position.x + ray.direction.x * dist,
					y: camera.position.y + ray.direction.y * dist,
					z: camera.position.z + ray.direction.z * dist }
	
	debug.position.set(cursor.x, cursor.y, cursor.z);
	debug.position.matrixNeedsUpdate = true;
	
	//for (var i = 0; i < gameObjects.length; i++) {
		var gameObject = gameObjects[0];

		var indexes = gameObject.isVoxelHere(cursor, brushThickness);
		if (indexes.length > 0) {
			if (ERASE_MODE) {
				gameObject.eraseVoxels(indexes);
			}
		}
	//}
}