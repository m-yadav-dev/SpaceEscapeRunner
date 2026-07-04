import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. Calculate boundaries and sizes once
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const SHIP_WIDTH = 50;
const SHIP_HEIGHT = 65; // 25 (nose) + 40 (body)
const SHIP_BOTTOM_OFFSET = 120; // How high off the bottom the ship sits
const SHIP_TOP_Y = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT;

const ASTEROID_SIZE = 40;
const MOVEMENT_STEP = 30;
const MAX_OFFSET = SCREEN_WIDTH / 2 - SHIP_WIDTH / 2 - 20;
const HIGH_SCORE_KEY = "space_escape_runner_high_score";

const createInitialGameState = () => ({
  asteroidX: Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE),
  asteroidY: -ASTEROID_SIZE,
  score: 0,
  isGameOver: false,
});

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [shipPosition, setShipPosition] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(0);

  // We use a Ref for the ship's position so the Game Loop can read the absolute
  // latest value without needing to restart the loop every time the ship moves.
  const shipPositionRef = useRef(0);

  // Group all loop-driven data into one state object to update them atomically
  const [gameState, setGameState] = useState(createInitialGameState);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        const parsedValue = Number(savedValue ?? "0");
        if (Number.isFinite(parsedValue) && parsedValue >= 0) {
          setHighScore(parsedValue);
          highScoreRef.current = parsedValue;
        }
      } catch (error) {
        console.warn("Failed to load high score", error);
      }
    };

    loadHighScore();
  }, []);

  const saveHighScore = async (value) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, String(value));
      setHighScore(value);
      highScoreRef.current = value;
    } catch (error) {
      console.warn("Failed to save high score", error);
    }
  };

  const startGame = () => {
    setShipPosition(0);
    shipPositionRef.current = 0;
    setGameState(createInitialGameState());
    setGameStarted(true);
  };

  const restartGame = () => {
    startGame();
  };

  const moveLeft = () => {
    if (gameState.isGameOver || !gameStarted) return;
    const newPos = Math.max(
      shipPositionRef.current - MOVEMENT_STEP,
      -MAX_OFFSET,
    );
    shipPositionRef.current = newPos;
    setShipPosition(newPos);
  };

  const moveRight = () => {
    if (gameState.isGameOver || !gameStarted) return;
    const newPos = Math.min(
      shipPositionRef.current + MOVEMENT_STEP,
      MAX_OFFSET,
    );
    shipPositionRef.current = newPos;
    setShipPosition(newPos);
  };

  // --- THE GAME LOOP ---
  useEffect(() => {
    let intervalId;

    if (gameStarted && !gameState.isGameOver) {
      intervalId = setInterval(() => {
        setGameState((prevState) => {
          let newY = prevState.asteroidY + 15; // Fall speed
          let newX = prevState.asteroidX;
          let newScore = prevState.score;

          // 1. Calculate Ship's Absolute Position
          const shipLeftX =
            SCREEN_WIDTH / 2 - SHIP_WIDTH / 2 + shipPositionRef.current;
          const shipRightX = shipLeftX + SHIP_WIDTH;

          // 2. Calculate Asteroid's Boundaries
          const astLeft = newX;
          const astRight = newX + ASTEROID_SIZE;
          const astTop = newY;
          const astBottom = newY + ASTEROID_SIZE;

          // 3. Collision Detection Math
          const isCollision =
            astBottom > SHIP_TOP_Y && // Asteroid bottom passes ship top
            astTop < SHIP_TOP_Y + SHIP_HEIGHT && // Asteroid top hasn't passed ship bottom
            astRight > shipLeftX && // Asteroid right edge passes ship left edge
            astLeft < shipRightX; // Asteroid left edge hasn't passed ship right edge

          if (isCollision) {
            return { ...prevState, isGameOver: true };
          }

          // 4. Reset Asteroid at Bottom & Score
          if (newY > SCREEN_HEIGHT) {
            newY = -ASTEROID_SIZE;
            newX = Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE);
            newScore += 1;
          }

          return {
            ...prevState,
            asteroidX: newX,
            asteroidY: newY,
            score: newScore,
          };
        });
      }, 30); // Runs roughly 33 times a second (~30 FPS)
    }

    // Cleanup function runs when the component unmounts or interval stops
    return () => clearInterval(intervalId);
  }, [gameStarted, gameState.isGameOver]); // Only re-run effect if game starts or ends

  useEffect(() => {
    if (!gameState.isGameOver) return;

    if (gameState.score > highScoreRef.current) {
      saveHighScore(gameState.score);
    }
  }, [gameState.isGameOver, gameState.score]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* HUD (Heads Up Display) */}
      <View style={styles.header}>
        <Text style={styles.title}>Space Escape Runner</Text>
        <Text style={styles.score}>Current Score: {gameState.score}</Text>
        <Text style={styles.highScore}>High Score: {highScore}</Text>
      </View>

      <View style={styles.gameArea}>
        {/* Render Asteroid if game is active */}
        {gameStarted && !gameState.isGameOver && (
          <View
            style={[
              styles.asteroid,
              { left: gameState.asteroidX, top: gameState.asteroidY },
            ]}
          />
        )}

        {/* The Spaceship */}
        <View
          style={[
            styles.shipContainer,
            {
              bottom: SHIP_BOTTOM_OFFSET,
              transform: [{ translateX: shipPosition }],
            },
          ]}
        >
          <View style={styles.shipNose} />
          <View style={styles.shipBody} />
          <View style={styles.shipWings} />
        </View>

        {/* Game Over Screen Overlay */}
        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.finalScoreText}>
              Final Score: {gameState.score}
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={restartGame}>
              <Text style={styles.buttonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Initial Start Screen Overlay */}
        {!gameStarted && !gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Movement Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moveButton} onPress={moveLeft}>
          <Text style={styles.buttonText}>Move Left</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moveButton} onPress={moveRight}>
          <Text style={styles.buttonText}>Move Right</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { alignItems: "center", paddingTop: 20, zIndex: 10 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 10,
  },
  score: { fontSize: 20, color: "#94a3b8", marginBottom: 20 },
  highScore: { fontSize: 18, color: "#fbbf24", marginBottom: 12 },
  startButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
  },
  gameArea: { flex: 1, position: "relative" },

  // Spaceship Styling
  shipContainer: {
    position: "absolute",
    left: "50%",
    marginLeft: -(SHIP_WIDTH / 2),
    width: SHIP_WIDTH,
    alignItems: "center",
  },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fbbf24",
  },
  shipBody: { width: 24, height: 40, backgroundColor: "#cbd5e1" },
  shipWings: {
    width: SHIP_WIDTH,
    height: 12,
    backgroundColor: "#ef4444",
    marginTop: -15,
    borderRadius: 5,
  },

  // Asteroid Styling
  asteroid: {
    position: "absolute",
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    backgroundColor: "#94a3b8",
    borderRadius: ASTEROID_SIZE / 2,
  },

  // Overlays
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  gameOverText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 10,
  },
  finalScoreText: { fontSize: 24, color: "#f8fafc", marginBottom: 20 },

  // Controls
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 40,
  },
  restartButton: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 15,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
  },
  moveButton: {
    backgroundColor: "#475569",
    paddingVertical: 15,
    borderRadius: 10,
    width: "32%",
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
});
