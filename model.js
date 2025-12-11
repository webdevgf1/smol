// Load and display the 3D model
export function initModel() {
    const container = document.getElementById('canvas-container');
    const loadingScreen = document.getElementById('loading-screen');

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1, 3);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6464ff, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xff64ff, 0.3);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    // Add orbit controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 1.5;

    // Load GLB model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'https://raw.githubusercontent.com/webdevgf1/smol/main/smol.glb',
        function (gltf) {
            const model = gltf.scene;

            // Center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            box.setFromObject(model);
            box.getCenter(center);
            model.position.sub(center);
            model.position.y = -0.5;

            scene.add(model);

            // Fade out loading screen
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 1500);
            }, 500);

            // Animate model (subtle rotation)
            function animateModel() {
                model.rotation.y += 0.001;
            }

            // Add to animation loop
            const originalAnimate = animate;
            animate = function() {
                originalAnimate();
                animateModel();
            };
        },
        function (xhr) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log('Model loading: ' + Math.round(percentComplete) + '%');
        },
        function (error) {
            console.error('Error loading model:', error);
            loadingScreen.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 10px; color: #ff6464;">Error Loading Model</div>
                    <div style="font-size: 14px; opacity: 0.6;">Please refresh the page</div>
                </div>
            `;
        }
    );

    // Animation loop
    let animate = function () {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
