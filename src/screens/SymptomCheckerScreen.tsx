import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Chip,
  Button,
  ActivityIndicator,
  Portal,
  Modal,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../styles/theme';
import { 
  analyzeSymptomSeverity, 
  type Symptom as AISymptom,
  type SymptomSeverityResult 
} from '../services/aiHealthService';

const { width } = Dimensions.get('window');

interface Symptom {
  id: number;
  name: string;
  emoji: string;
  category: string;
}

interface Disease {
  name: string;
  probability: number;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

const commonSymptoms: Symptom[] = [
  { id: 1, name: 'Headache', emoji: '🤕', category: 'pain' },
  { id: 2, name: 'Fever', emoji: '🌡️', category: 'general' },
  { id: 3, name: 'Cough', emoji: '😷', category: 'respiratory' },
  { id: 4, name: 'Fatigue', emoji: '😴', category: 'general' },
  { id: 5, name: 'Nausea', emoji: '🤢', category: 'digestive' },
  { id: 6, name: 'Sore Throat', emoji: '🤒', category: 'respiratory' },
  { id: 7, name: 'Body Pain', emoji: '💪', category: 'pain' },
  { id: 8, name: 'Dizziness', emoji: '😵', category: 'general' },
  { id: 9, name: 'Stomach Ache', emoji: '🤰', category: 'digestive' },
  { id: 10, name: 'Runny Nose', emoji: '🤧', category: 'respiratory' },
  { id: 11, name: 'Chest Pain', emoji: '💔', category: 'pain' },
  { id: 12, name: 'Shortness of Breath', emoji: '😮‍💨', category: 'respiratory' },
];

const diseaseDatabase: Record<string, Disease[]> = {
  respiratory: [
    { name: 'Common Cold', probability: 75, severity: 'low', recommendations: ['Rest', 'Stay hydrated', 'Use steam inhalation'] },
    { name: 'Flu (Influenza)', probability: 65, severity: 'medium', recommendations: ['Rest', 'Antiviral medication', 'Consult doctor'] },
    { name: 'Bronchitis', probability: 45, severity: 'medium', recommendations: ['Avoid smoke', 'Use humidifier', 'See a doctor'] }
  ],
  pain: [
    { name: 'Migraine', probability: 70, severity: 'medium', recommendations: ['Rest in dark room', 'Pain medication', 'Avoid triggers'] },
    { name: 'Tension Headache', probability: 80, severity: 'low', recommendations: ['Reduce stress', 'Pain reliever', 'Adequate sleep'] },
    { name: 'Muscle Strain', probability: 60, severity: 'low', recommendations: ['Rest', 'Ice/Heat therapy', 'Gentle stretching'] }
  ],
  general: [
    { name: 'Viral Infection', probability: 70, severity: 'low', recommendations: ['Rest', 'Stay hydrated', 'Monitor temperature'] },
    { name: 'Fatigue Syndrome', probability: 55, severity: 'medium', recommendations: ['Improve sleep', 'Balanced diet', 'Regular exercise'] }
  ],
  digestive: [
    { name: 'Gastroenteritis', probability: 65, severity: 'medium', recommendations: ['Stay hydrated', 'Light diet', 'Rest'] },
    { name: 'Food Poisoning', probability: 55, severity: 'medium', recommendations: ['Clear fluids', 'Avoid solid foods', 'Seek medical help if severe'] },
    { name: 'Indigestion', probability: 75, severity: 'low', recommendations: ['Avoid spicy foods', 'Eat small meals', 'Antacids'] }
  ]
};

const SymptomCheckerScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<Record<number, {
    intensity: 1 | 2 | 3 | 4 | 5;
    duration: 'hours' | 'days' | 'weeks' | 'months';
    frequency: 'constant' | 'frequent' | 'occasional' | 'rare';
  }>>({});
  const [analysisResult, setAnalysisResult] = useState<SymptomSeverityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentSymptomId, setCurrentSymptomId] = useState<number | null>(null);

  const filteredSymptoms = commonSymptoms.filter(s =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSymptomSelect = (symptom: Symptom) => {
    if (selectedSymptoms.find(s => s.id === symptom.id)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== symptom.id));
      const newDetails = { ...symptomDetails };
      delete newDetails[symptom.id];
      setSymptomDetails(newDetails);
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
      // Show detail modal for intensity/duration
      setCurrentSymptomId(symptom.id);
      setShowDetailModal(true);
    }
  };

  const handleDetailSave = (intensity: 1|2|3|4|5, duration: 'hours'|'days'|'weeks'|'months', frequency: 'constant'|'frequent'|'occasional'|'rare') => {
    if (currentSymptomId) {
      setSymptomDetails({
        ...symptomDetails,
        [currentSymptomId]: { intensity, duration, frequency }
      });
    }
    setShowDetailModal(false);
    setCurrentSymptomId(null);
  };

  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) return;
    
    setIsAnalyzing(true);
    
    // Convert to AI service format
    const aiSymptoms: AISymptom[] = selectedSymptoms.map(s => {
      const details = symptomDetails[s.id] || { intensity: 3, duration: 'days', frequency: 'occasional' };
      return {
        id: s.id.toString(),
        name: s.name,
        duration: details.duration,
        durationValue: 1,
        intensity: details.intensity,
        frequency: details.frequency,
        category: s.category as AISymptom['category'],
      };
    });
    
    // Simulate network delay for UX
    await new Promise(resolve => setTimeout(() => resolve(undefined), 1500));
    
    // Use AI service for analysis
    const result = analyzeSymptomSeverity(aiSymptoms);
    
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setShowResultModal(true);
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setSearchText('');
    setAnalysisResult(null);
    setSymptomDetails({});
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return colors.error;
      case 'high': return '#FF5722';
      case 'medium': return colors.warning;
      default: return colors.success;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.error;
      default: return colors.info;
    }
  };

  const renderSymptomCard = ({ item }: { item: Symptom }) => {
    const isSelected = selectedSymptoms.find(s => s.id === item.id);
    return (
      <TouchableOpacity
        style={[
          styles.symptomCard,
          isSelected && styles.symptomCardSelected
        ]}
        onPress={() => handleSymptomSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.symptomEmoji}>{item.emoji}</Text>
        <Text style={[
          styles.symptomName,
          isSelected && styles.symptomNameSelected
        ]}>
          {item.name}
        </Text>
        {isSelected && (
          <Icon name="check-circle" size={20} color={colors.primary} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.primary} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Symptom Checker</Text>
            <Text style={styles.headerSubtitle}>Powered by Advanced AI</Text>
          </View>
          <IconButton
            icon="refresh"
            iconColor="white"
            size={24}
            onPress={handleReset}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            mode="outlined"
            placeholder="Search symptoms..."
            value={searchText}
            onChangeText={setSearchText}
            left={<TextInput.Icon icon="magnify" />}
            style={styles.searchInput}
            outlineStyle={styles.searchOutline}
          />
        </View>

        {/* Selected Symptoms */}
        {selectedSymptoms.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.sectionTitle}>
              Selected Symptoms ({selectedSymptoms.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedSymptoms.map(symptom => (
                <Chip
                  key={symptom.id}
                  onClose={() => handleSymptomSelect(symptom)}
                  style={styles.selectedChip}
                  textStyle={styles.chipText}
                >
                  {symptom.emoji} {symptom.name}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Common Symptoms */}
        <Text style={styles.sectionTitle}>Common Symptoms</Text>
        <FlatList
          data={filteredSymptoms}
          renderItem={renderSymptomCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.symptomRow}
        />

        {/* Analyze Button */}
        <Button
          mode="contained"
          onPress={handleAnalyze}
          loading={isAnalyzing}
          disabled={selectedSymptoms.length === 0 || isAnalyzing}
          style={styles.analyzeButton}
          contentStyle={styles.analyzeButtonContent}
          icon="brain"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
        </Button>

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Card.Content>
            <View style={styles.disclaimerContent}>
              <Icon name="info" size={20} color={colors.info} />
              <Text style={styles.disclaimerText}>
                This AI-powered symptom checker provides general health information only. 
                It is not a substitute for professional medical advice, diagnosis, or treatment.
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Symptom Detail Modal */}
      <Portal>
        <Modal
          visible={showDetailModal}
          onDismiss={() => {
            setShowDetailModal(false);
            if (currentSymptomId) {
              // Remove symptom if details not saved
              setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== currentSymptomId));
            }
            setCurrentSymptomId(null);
          }}
          contentContainerStyle={styles.detailModalContainer}
        >
          <SymptomDetailForm 
            symptomName={currentSymptomId ? selectedSymptoms.find(s => s.id === currentSymptomId)?.name || '' : ''}
            onSave={handleDetailSave}
            onCancel={() => {
              setShowDetailModal(false);
              if (currentSymptomId) {
                setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== currentSymptomId));
              }
              setCurrentSymptomId(null);
            }}
          />
        </Modal>
      </Portal>

      {/* Result Modal */}
      <Portal>
        <Modal
          visible={showResultModal}
          onDismiss={() => setShowResultModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Analysis Results</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowResultModal(false)}
              />
            </View>

            {analysisResult && (
              <>
                {/* Severity Overview */}
                <Card style={[styles.severityOverviewCard, { borderLeftColor: getUrgencyColor(analysisResult.urgencyLevel) }]}>
                  <Card.Content>
                    <View style={styles.severityHeader}>
                      <View>
                        <Text style={styles.severityLabel}>Severity Score</Text>
                        <Text style={[styles.severityScore, { color: getUrgencyColor(analysisResult.urgencyLevel) }]}>
                          {analysisResult.severityScore}/100
                        </Text>
                      </View>
                      <Chip
                        style={[styles.urgencyChip, { backgroundColor: getUrgencyColor(analysisResult.urgencyLevel) }]}
                        textStyle={{ color: 'white', fontWeight: '600' }}
                      >
                        {analysisResult.urgencyLevel.toUpperCase()}
                      </Chip>
                    </View>
                    <Text style={styles.severityStatus}>
                      Overall: {analysisResult.overallSeverity.charAt(0).toUpperCase() + analysisResult.overallSeverity.slice(1)}
                    </Text>
                  </Card.Content>
                </Card>

                {/* Red Flags Warning */}
                {analysisResult.redFlags.length > 0 && (
                  <Card style={styles.redFlagsCard}>
                    <Card.Content>
                      <View style={styles.redFlagsHeader}>
                        <Icon name="warning" size={24} color={colors.error} />
                        <Text style={styles.redFlagsTitle}>Warning Signs Detected</Text>
                      </View>
                      {analysisResult.redFlags.map((flag, index) => (
                        <Text key={index} style={styles.redFlagItem}>⚠️ {flag}</Text>
                      ))}
                    </Card.Content>
                  </Card>
                )}

                {/* Recommendation */}
                <Card style={styles.recommendationCard}>
                  <Card.Content>
                    <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
                    <Text style={styles.recommendationText}>{analysisResult.recommendation}</Text>
                  </Card.Content>
                </Card>

                {/* Possible Conditions */}
                {analysisResult.estimatedConditions.length > 0 && (
                  <>
                    <Text style={styles.conditionsTitle}>Possible Conditions</Text>
                    {analysisResult.estimatedConditions.map((condition, index) => (
                      <Card key={index} style={styles.predictionCard}>
                        <Card.Content>
                          <View style={styles.predictionHeader}>
                            <Text style={styles.predictionName}>{condition.name}</Text>
                            <Chip
                              style={[styles.severityChip, { backgroundColor: getSeverityColor(condition.severity) + '20' }]}
                              textStyle={{ color: getSeverityColor(condition.severity), fontSize: 10 }}
                            >
                              {condition.severity.toUpperCase()}
                            </Chip>
                          </View>
                          <View style={styles.probabilityContainer}>
                            <View style={[styles.probabilityBar, { width: `${condition.probability}%`, backgroundColor: colors.primary }]} />
                          </View>
                          <Text style={styles.probabilityText}>{condition.probability}% match</Text>
                          <Text style={styles.specialistText}>
                            Recommended specialist: {condition.specialistType}
                          </Text>
                        </Card.Content>
                      </Card>
                    ))}
                  </>
                )}

                {/* Action Buttons */}
                {analysisResult.shouldSeekMedicalAttention ? (
                  <Button
                    mode="contained"
                    onPress={() => {
                      setShowResultModal(false);
                      navigation.navigate('Emergency' as never);
                    }}
                    style={[styles.findDoctorButton, { backgroundColor: colors.error }]}
                    icon="hospital-box"
                  >
                    Seek Medical Attention
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => {
                      setShowResultModal(false);
                      navigation.navigate('DoctorFinder' as never);
                    }}
                    style={styles.findDoctorButton}
                    icon="hospital-box"
                  >
                    Find a Doctor
                  </Button>
                )}
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

// Symptom Detail Form Component
const SymptomDetailForm = ({ 
  symptomName, 
  onSave, 
  onCancel 
}: { 
  symptomName: string;
  onSave: (intensity: 1|2|3|4|5, duration: 'hours'|'days'|'weeks'|'months', frequency: 'constant'|'frequent'|'occasional'|'rare') => void;
  onCancel: () => void;
}) => {
  const [intensity, setIntensity] = useState<1|2|3|4|5>(3);
  const [duration, setDuration] = useState<'hours'|'days'|'weeks'|'months'>('days');
  const [frequency, setFrequency] = useState<'constant'|'frequent'|'occasional'|'rare'>('occasional');

  return (
    <View>
      <Text style={styles.detailTitle}>Tell us more about: {symptomName}</Text>
      
      <Text style={styles.detailLabel}>Intensity (1-5)</Text>
      <View style={styles.intensityRow}>
        {([1, 2, 3, 4, 5] as const).map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.intensityButton, intensity === val && styles.intensityButtonActive]}
            onPress={() => setIntensity(val)}
          >
            <Text style={[styles.intensityText, intensity === val && styles.intensityTextActive]}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.intensityLabels}>
        <Text style={styles.intensityLabelText}>Mild</Text>
        <Text style={styles.intensityLabelText}>Severe</Text>
      </View>

      <Text style={styles.detailLabel}>Duration</Text>
      <SegmentedButtons
        value={duration}
        onValueChange={(value) => setDuration(value as typeof duration)}
        buttons={[
          { value: 'hours', label: 'Hours' },
          { value: 'days', label: 'Days' },
          { value: 'weeks', label: 'Weeks' },
          { value: 'months', label: 'Months' },
        ]}
        style={styles.segmentedButtons}
      />

      <Text style={styles.detailLabel}>Frequency</Text>
      <SegmentedButtons
        value={frequency}
        onValueChange={(value) => setFrequency(value as typeof frequency)}
        buttons={[
          { value: 'rare', label: 'Rare' },
          { value: 'occasional', label: 'Occasional' },
          { value: 'frequent', label: 'Frequent' },
          { value: 'constant', label: 'Constant' },
        ]}
        style={styles.segmentedButtons}
      />

      <View style={styles.detailActions}>
        <Button mode="outlined" onPress={onCancel} style={styles.detailButton}>Cancel</Button>
        <Button mode="contained" onPress={() => onSave(intensity, duration, frequency)} style={styles.detailButton}>Save</Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  searchOutline: {
    borderRadius: 12,
    borderColor: colors.outline,
  },
  selectedContainer: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginVertical: 12,
  },
  selectedChip: {
    marginRight: 8,
    backgroundColor: colors.primaryContainer,
  },
  chipText: {
    color: colors.primary,
  },
  symptomRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  symptomCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  symptomCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  symptomEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  symptomName: {
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'center',
  },
  symptomNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  analyzeButton: {
    marginTop: 24,
    borderRadius: 12,
  },
  analyzeButtonContent: {
    paddingVertical: 8,
  },
  disclaimerCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.infoContainer,
  },
  disclaimerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  predictionCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  severityChip: {
    height: 24,
  },
  probabilityContainer: {
    height: 8,
    backgroundColor: colors.outlineVariant,
    borderRadius: 4,
    marginBottom: 4,
  },
  probabilityBar: {
    height: '100%',
    borderRadius: 4,
  },
  probabilityText: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
    lineHeight: 20,
  },
  findDoctorButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  // AI Result Styles
  severityOverviewCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  severityScore: {
    fontSize: 36,
    fontWeight: '700',
  },
  severityStatus: {
    marginTop: 8,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  urgencyChip: {
    borderRadius: 8,
  },
  redFlagsCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  redFlagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  redFlagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
  redFlagItem: {
    fontSize: 14,
    color: colors.error,
    marginLeft: 4,
    marginTop: 4,
  },
  recommendationCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 22,
  },
  conditionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
  },
  specialistText: {
    fontSize: 12,
    color: colors.onSurface,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Symptom Detail Form Styles
  detailModalContainer: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 20,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: colors.primary,
  },
  intensityText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  intensityTextActive: {
    color: 'white',
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  intensityLabelText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  detailButton: {
    flex: 1,
    borderRadius: 8,
  },
});

export default SymptomCheckerScreen;
