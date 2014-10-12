Engine.OctreeManager = function()
{
    this.octreeRoot;
    
    this.geometryOctree;
    this.meshOctree;
    
    this.Init = function()
    {
        // 
        this.octreeRoot = undefined;
        this.geometryOctree = new THREE.Geometry();
        this.meshOctree = new THREE.Mesh(this.geometryOctree, Engine.Materials.octree);
    };
    
    this.SetupModel = function(model)
    {
        // Find max size from bounds
        var dimension = Math.max(Math.ceil(model.meshSize.x), Math.max(Math.ceil(model.meshSize.y), Math.ceil(model.meshSize.z)));
        // Find closest power of two
        dimension = Engine.ClosestPowerOfTwo(dimension);

        // Position
        var position = {x:0, y:0, z:0};

        // Octree
        this.octreeRoot = new Octree(position, dimension);
    };
    
    this.AddCube = function(position, dimension, materialIndex)
    {
        var cube = new THREE.Mesh( Engine.BoxGeometry );
        cube.position.set(position.x, position.y, position.z);
        cube.scale.set(dimension.x, dimension.y, dimension.z);
        cube.updateMatrix();
        this.geometryOctree.merge(cube.geometry, cube.matrix, materialIndex);
    };
};

// Thank to Brandon Pelfrey
// To share his knownledge by giving this simple octree code
// http://www.brandonpelfrey.com/blog/coding-a-simple-octree/
Engine.Octree = function(position_, dimension_) {
	// Physical position/size. This implicitly defines the bounding 
	// box of this node
	this.position = position_;         //! The physical center of this node
    this.dimension = dimension_;
	this.dimensionHalf = {
        x: dimension_.x / 2,
        y: dimension_.y / 2,
        z: dimension_.z / 2
    };  
    /*
	this.left = this.position.x - this.dimensionHalf.x;
	this.right = this.position.x + this.dimensionHalf.x;
	this.bottom = this.position.y - this.dimensionHalf.x;
	this.top = this.position.y + this.dimensionHalf.x;
	this.back = this.position.z - this.dimensionHalf.x;
	this.front = this.position.z + this.dimensionHalf.x;
    */
	// The tree has up to eight children and can additionally store
	// a point, though in many applications only, the leaves will store data.
	this.children = new Array(8); //! Pointers to child octants
	for (var i = 0; i < 8; ++i) { this.children[i] = undefined; }
	this.data = undefined;   //! Data point to be stored at a node

	/*
			Children follow a predictable pattern to make accesses simple.
			Here, - means less than 'position' in that dimension, + means greater than.
			child:	0 1 2 3 4 5 6 7
			x:      - - - - + + + +
			y:      - - + + - - + +
			z:      - + - + - + - +
	 */

	// Determine which octant of the tree would contain 'point'
	this.getOctantContainingPoint = function(point) {
		var oct = 0;
		if(point.x >= this.position.x) oct |= 4;
		if(point.y >= this.position.y) oct |= 2;
		if(point.z >= this.position.z) oct |= 1;
		return oct;
	}

	this.isLeafNode = function() {
		// We are a leaf iff we have no children. Since we either have none, or 
		// all eight, it is sufficient to just check the first.
		return this.children[0] == undefined;
	}

	this.hasChildren = function() {
		return !this.isLeafNode();
	}

	this.hasAllChildren = function()
	{/*
		if (this.hasChildren() == false) {
			return false;
		}

		for (var c = 0; c < 8; ++c) {
			var child = this.children[c];
			if (!child.isLeafNode() && child.data != undefined) {
				return false;
			}
			/*
			if (child.hasChildren() == false) {
				return false;
			}*/
		// }
		// */
		return false;
	}

	this.insert = function(point) {
		// If this node doesn't have a data point yet assigned 
		// and it is a leaf, then we're done!
		if (this.isLeafNode()) {
			// console.log(this.data);
			if (this.data == undefined) {
				this.data = point;
				return;
			} else {
				// We're at a leaf, but there's already something here
				// We will split this node so that it has 8 child octants
				// and then insert the old data that was here, along with 
				// this new data point

				// Save this data point that was here for a later re-insert
				var oldPoint = this.data;
				this.data = undefined;

				// Split the current node and create new empty trees for each
				// child octant.
				for(var i=0; i<8; ++i) {
					// Compute new bounding box for this child
					var newPosition = {
						x: this.position.x + this.dimensionHalf.x * ((i&4) != 0 ? 0.5 : -0.5),
						y: this.position.y + this.dimensionHalf.y * ((i&2) != 0 ? 0.5 : -0.5),
						z: this.position.z + this.dimensionHalf.z * ((i&1) != 0 ? 0.5 : -0.5)};
                    
                    // Create child
					this.children[i] = new Octree(newPosition, this.dimensionHalf);
				}

				// Re-insert the old point, and insert this new point
				// (We wouldn't need to insert from the root, because we already
				// know it's guaranteed to be in this section of the tree)
				this.children[this.getOctantContainingPoint(oldPoint)].insert(oldPoint);
				this.children[this.getOctantContainingPoint(point)].insert(point);
			}
		} else {
			// We are at an interior node. Insert recursively into the 
			// appropriate child octant
			var octant = this.getOctantContainingPoint(point);
			this.children[octant].insert(point);
		}
	}

	this.split = function()
	{
		// Save this data point that was here for a later re-insert
		var oldPoint = this.data;
		this.data = undefined;

		// Split the current node and create new empty trees for each
		// child octant.
		for(var i=0; i<8; ++i) {
			// Compute new bounding box for this child
			var newposition = {
				x: this.position.x + this.dimensionHalf.x * ((i&4) != 0 ? 0.5 : -0.5),
				y: this.position.y + this.dimensionHalf.y * ((i&2) != 0 ? 0.5 : -0.5),
				z: this.position.z + this.dimensionHalf.z * ((i&1) != 0 ? 0.5 : -0.5)};
			
            // Create child
			this.children[i] = new Octree(newposition, this.dimensionHalf);
		}

		// Re-insert the old point, and insert this new point
		// (We wouldn't need to insert from the root, because we already
		// know it's guaranteed to be in this section of the tree)
		this.children[this.getOctantContainingPoint(oldPoint)].insert(oldPoint);
	}

	this.splitRandom = function()
	{
		// Save this data point that was here for a later re-insert
		// var oldPoint = this.data;
		this.data = undefined;

		// Split the current node and create new empty trees for each
		// child octant.
		for(var i=0; i<8; ++i) {
			// Compute new bounding box for this child
			var newposition = {
				x: this.position.x + this.dimensionHalf.x * ((i&4) != 0 ? 0.5 : -0.5),
				y: this.position.y + this.dimensionHalf.y * ((i&2) != 0 ? 0.5 : -0.5),
				z: this.position.z + this.dimensionHalf.z * ((i&1) != 0 ? 0.5 : -0.5)};
            
            // Generate child
			this.children[i] = new Octree(newposition, this.dimensionHalf);
			this.children[i].data = Math.random() > 0.5 ? newposition : undefined;
		}

		// Re-insert the old point, and insert this new point
		// (We wouldn't need to insert from the root, because we already
		// know it's guaranteed to be in this section of the tree)
		// this.children[this.getOctantContainingPoint(oldPoint)].insert(oldPoint);

	}
/*
	this.search = function(position, direction, distance)
	{
		var directionPct = { x:1/direction, y:1/direction, z:1/direction };

		var t1 = ( this.left - position.x ) * directionPct.x,
			t2 = ( this.right - position.x ) * directionPct.x,
			t3 = ( this.bottom - position.y ) * directionPct.y,
			t4 = ( this.top - position.y ) * directionPct.y,
			t5 = ( this.back - position.z ) * directionPct.z,
			t6 = ( this.front - position.z ) * directionPct.z,
			tmax = Math.min( Math.min( Math.max( t1, t2), Math.max( t3, t4) ), Math.max( t5, t6) ),
			tmin;

		// ray would intersect in reverse direction, i.e. this is behind ray
		if (tmax < 0)
		{
			return false;
		}
		
		tmin = Math.max( Math.max( Math.min( t1, t2), Math.min( t3, t4)), Math.min( t5, t6));
		
		// if tmin > tmax or tmin > ray distance, ray doesn't intersect AABB
		if( tmin > tmax || tmin > distance ) {
			return false;
		}
		
		return true;
	}
*/

	// This is a really simple routine for querying the tree for points
	// within a bounding box defined by min/max points (bmin, bmax)
	// All results are pushed into 'results'
	this.getPointsInsideBox = function(bmin, bmax, results) {
		// If we're at a leaf node, just see if the current data point is inside
		// the query bounding box
		if (this.isLeafNode()) {
			if (this.data !== undefined) {
				var p = this.data.position;
				if (p.x>bmax.x || p.y>bmax.y || p.z>bmax.z) return;
				if (p.x<bmin.x || p.y<bmin.y || p.z<bmin.z) return;
				results.Add(this.data);
			}
		} else {
			// We're at an interior node of the tree. We will check to see if
			// the query bounding box lies outside the octants of this node.
			for(var i=0; i<8; ++i) {
				// Compute the min/max corners of this child octant
				var ori = this.children[i].position;
				var half = this.children[i].dimensionHalf;
				var cmax = { x:ori.x + half.x, y: ori.y + half.y, z: ori.z + half.z };
				var cmin = { x:ori.x - half.x, y: ori.y - half.y, z: ori.z - half.z };

				// If the query rectangle is outside the child's bounding box, 
				// then continue
				if(cmax.x<bmin.x || cmax.y<bmin.y || cmax.z<bmin.z) continue;
				if(cmin.x>bmax.x || cmin.y>bmax.y || cmin.z>bmax.z) continue;

				// At this point, we've determined that this child is intersecting 
				// the query bounding box
				this.children[i].getPointsInsideBox(bmin,bmax,results);
			} 
		}
	}
}
