# Space Escape Runner 🚀

A fast-paced, mobile 2D arcade survival game built entirely with React Native and Expo. 


<img width="400" height="600" alt="Space Escape Runner (1)" src="https://github.com/user-attachments/assets/dbcf6b4f-3968-40fd-9d41-3f217c4ed191" />


* **Framework:** React Native
* **Environment:** Expo & Expo Go
* **Storage:** AsyncStorage (Local High Score Persistence)
* **Language:** JavaScript (ES6+)

## ✨ Core Engineering Achievements
* **Custom Physics & Game Loop:** Implemented a custom 30 FPS game loop using React `useEffect` and `useRef` to maintain real-time state and bypass stale closures without relying on heavy third-party game engines.
* **Axis-Aligned Bounding Box (AABB) Collision:** Engineered precise, multi-condition mathematical collision detection between the player and falling obstacles on the native UI thread.
* **Zero-Asset UI Design:** Built the spaceship and gameplay elements using pure React Native `<View>` shapes and border manipulations, keeping the application bundle exceptionally lightweight.
* **Persistent Local State:** Integrated `@react-native-async-storage/async-storage` for reliable, asynchronous high-score tracking across application sessions.

## 🚀 Quick Start (Run Locally)

Want to test the app on your own device? 

**1. Clone the repository**
```bash
1. git clone https://github.com/m-yadav-dev/SpaceEscapeRunner.git
cd SpaceEscapeRunner

2. Install dependencies
npm install

3. Start the Expo development server
npx expo start
