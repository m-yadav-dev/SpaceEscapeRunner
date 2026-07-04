import { useState, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

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
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(0);
  const shipTranslateX = useRef(new Animated.Value(0)).current;

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
    shipPositionRef.current = 0;
    shipTranslateX.setValue(0);
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
    Animated.timing(shipTranslateX, {
      toValue: newPos,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const moveRight = () => {
    if (gameState.isGameOver || !gameStarted) return;
    const newPos = Math.min(
      shipPositionRef.current + MOVEMENT_STEP,
      MAX_OFFSET,
    );
    shipPositionRef.current = newPos;
    Animated.timing(shipTranslateX, {
      toValue: newPos,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
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
      <LinearGradient
        colors={["#050816", "#0f172a", "#1f1147"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.starField} pointerEvents="none">
        <View style={[styles.star, styles.starOne]} />
        <View style={[styles.star, styles.starTwo]} />
        <View style={[styles.star, styles.starThree]} />
        <View style={[styles.star, styles.starFour]} />
      </View>

      {/* HUD (Heads Up Display) */}
      <View style={styles.header}>
        <View style={styles.hudGlass}>
          <Text style={styles.title}>Space Escape Runner</Text>
          <View style={styles.hudRow}>
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>Score</Text>
              <Text style={styles.score}>{gameState.score}</Text>
            </View>
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>High</Text>
              <Text style={styles.highScore}>{highScore}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.gameArea}>
        <LinearGradient
          colors={[
            "rgba(96, 165, 250, 0.08)",
            "rgba(168, 85, 247, 0.04)",
            "rgba(0,0,0,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.vignette}
          pointerEvents="none"
        />
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
        <Animated.View
          style={[
            styles.shipContainer,
            {
              bottom: SHIP_BOTTOM_OFFSET,
              transform: [{ translateX: shipTranslateX }],
            },
          ]}
        >
          <View style={styles.shipGlow} />
          <View style={styles.shipShadow} />
          <View style={styles.shipEngineGlow} />
          <View style={styles.shipNose} />
          <View style={styles.shipBody} />
          <View style={styles.shipCore} />
          <View style={styles.shipWingLeft} />
          <View style={styles.shipWingRight} />
        </Animated.View>

        {/* Game Over Screen Overlay */}
        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.overlayGlass}>
              <Text style={styles.gameOverText}>GAME OVER</Text>
              <Text style={styles.finalScoreText}>
                Final Score: {gameState.score}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={restartGame}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Initial Start Screen Overlay */}
        {!gameStarted && !gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.overlayGlass}>
              <Text style={styles.overlayTitle}>Launch Sequence Ready</Text>
              <Text style={styles.overlayCopy}>
                Dodge the meteors and survive as long as you can.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
                <Text style={styles.buttonText}>Start Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Movement Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, styles.restartButton]} onPress={restartGame}>
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.moveButton]} onPress={moveLeft}>
          <Text style={styles.buttonText}>Move Left</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.moveButton]} onPress={moveRight}>
          <Text style={styles.buttonText}>Move Right</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816" },
  starField: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    shadowColor: "#93c5fd",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  starOne: { width: 3, height: 3, top: 80, left: 42 },
  starTwo: { width: 2, height: 2, top: 160, right: 52 },
  starThree: { width: 4, height: 4, top: 280, left: 110 },
  starFour: { width: 2, height: 2, top: 360, right: 120 },
  header: { alignItems: "center", paddingTop: 16, zIndex: 10 },
  hudGlass: {
    width: "92%",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.16)",
    shadowColor: "#60a5fa",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  hudRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  hudChip: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  hudLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#93c5fd",
    marginBottom: 4,
  },
  score: { fontSize: 24, color: "#f8fafc", fontWeight: "800" },
  highScore: { fontSize: 24, color: "#fde68a", fontWeight: "800" },
  primaryButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginTop: 18,
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.35)",
    shadowColor: "#60a5fa",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  overlayGlass: {
    width: "88%",
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  gameArea: { flex: 1, position: "relative" },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  // Spaceship Styling
  shipContainer: {
    position: "absolute",
    left: "50%",
    marginLeft: -(SHIP_WIDTH / 2),
    width: SHIP_WIDTH,
    alignItems: "center",
    zIndex: 5,
  },
  shipGlow: {
    position: "absolute",
    top: 10,
    width: 58,
    height: 78,
    borderRadius: 32,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  shipShadow: {
    position: "absolute",
    top: 14,
    width: 46,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
  },
  shipEngineGlow: {
    position: "absolute",
    bottom: 0,
    width: 18,
    height: 16,
    borderRadius: 10,
    backgroundColor: "rgba(34, 211, 238, 0.85)",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  shipNose: {
    zIndex: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#7dd3fc",
  },
  shipBody: {
    width: 24,
    height: 40,
    backgroundColor: "#cbd5e1",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    shadowColor: "#60a5fa",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  shipCore: {
    position: "absolute",
    top: 26,
    width: 8,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#22d3ee",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  shipWingLeft: {
    position: "absolute",
    top: 26,
    left: 0,
    width: 17,
    height: 14,
    borderRadius: 10,
    backgroundColor: "#38bdf8",
    transform: [{ rotate: "18deg" }, { translateX: -7 }],
    shadowColor: "#38bdf8",
    shadowOpacity: 0.65,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  shipWingRight: {
    position: "absolute",
    top: 26,
    right: 0,
    width: 17,
    height: 14,
    borderRadius: 10,
    backgroundColor: "#a855f7",
    transform: [{ rotate: "-18deg" }, { translateX: 7 }],
    shadowColor: "#a855f7",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  // Asteroid Styling
  asteroid: {
    position: "absolute",
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    borderRadius: ASTEROID_SIZE / 2,
    backgroundColor: "rgba(148, 163, 184, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#fb7185",
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  // Overlays
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.62)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  gameOverText: {
    fontSize: 40,
    fontWeight: "900",
    color: "#fda4af",
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  overlayTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#f8fafc",
    marginBottom: 10,
    textAlign: "center",
  },
  overlayCopy: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  finalScoreText: { fontSize: 24, color: "#f8fafc", marginBottom: 6 },

  // Controls
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  controlButton: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  restartButton: {
    backgroundColor: "rgba(59, 130, 246, 0.22)",
    borderColor: "rgba(96, 165, 250, 0.35)",
  },
  moveButton: {
    backgroundColor: "rgba(71, 85, 105, 0.35)",
  },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});
