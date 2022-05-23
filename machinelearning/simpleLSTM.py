# LSTM script for VPGT

import numpy as np
import glob
import json
import os
import pandas as pd
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import ModelCheckpoint
from random import randint, seed, random
from sklearn.metrics import mean_squared_error
from math import sqrt, sin, cos, radians, floor

# Get a list of the files in the directory and read them all into a numpy array
def readData():
    files = glob.glob('./machinelearning/training/preprocessed/*.json')
    pathsDeltasList = []
    origPointList = []
    for file in files:
        pass

    path = pd.read_json(files[5])
    path.drop(['Percent Padded','MMSI'], axis= 1, inplace= True)
    path = pd.DataFrame((path['PathData'].values).squeeze().tolist(),columns=range(6))

    pathDeltas = path.diff()
    pathDeltas.iloc[0] = np.zeros(path.shape[1])

    return pathDeltas, path.values[0]

# Output paths to json
def outputPaths(pred, MMSI, events):
    dfPath = pd.DataFrame(pred)
    dfPath.reset_index(drop=True, inplace=True)
    pathStr = dfPath.to_json(orient = 'values', indent = 4)

    pathObj = { 'MMSI' : MMSI, 'PathData' : json.loads(pathStr), 'PathEvents' : events}

    with open('./machinelearning/generated/generated_path.json','w') as file:
        json.dump(pathObj, file, indent=4)

def fitLSTM(trainX, trainY, testX, testY, epochs, neurons, batch_size):
    
    # design network
    model = Sequential()
    model.add(LSTM(units=neurons, batch_input_shape=(batch_size, trainX.shape[1],trainX.shape[2]), return_sequences=True, stateful=True))
    model.add(Dense(6))
    model.compile(loss='mse', optimizer='adam')

    # fit network
    model.fit(trainX, trainY, epochs=epochs, validation_data=(testX, testY), verbose=2, shuffle=False)
    # Save the model as an h5 file
    model.save('./machinelearning/models/savedModel.h5')
    return model

# Function to clear any old json files from the output folder
def clearJsons():
    '''Deletes all JSON files in ./generated/ folder'''

    print('Clearning JSON files in generated file.')
    removed = 0
    for file in glob.glob('.\\machinelearning\\generated\\*'):
        #for file in glob.glob('%s\\*.json' %folder):
        os.remove(file) 
        removed = removed + 1
    print('Removed: %d files.' % removed)

# Function to take a start point and list of deltas and return a new path
def deltaToPath(deltas, start):
    """
    Builds a path from a start point and a list of deltas
  
    Parameters
    ----------
    start : 
        The original start point the deltas will be applied to.
    deltas :
        A set of deltas to apply to the original point.

    Outputs
    -------
    A dataframe of path points.

    """
    print(start)
    start = pd.DataFrame([start], columns=range(6))
    deltas = pd.DataFrame(deltas)
    deltas = pd.concat([start, deltas]).reset_index(drop = True).cumsum()
    return deltas

def genPath(argv, usePretrained):
    # experemental
    eventChance = 0
    events = []
    seed()

    pathLen = 0

    # Create a variable to hold the start point data
    startPoint = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    
    # Generate random values to replace null inputs
    # Time
    startPoint[0] = -100 + (random()*(100-(-100)))
    # Latitude
    if(argv[1] == 'null'):
        startPoint[1] = -90 + (random()*(90-(-90)))
    else:
        startPoint[1] = float(argv[1])
    # Longitude
    if(argv[2] == 'null'):
        startPoint[2] = -180 + (random()*(180-(-180)))
    else:
        startPoint[2] = float(argv[2])
    # MMSI
    if(argv[3] == 'null'):
        MMSI = floor(100000000 + (random()*(999999999-(100000000))))
    else:
        MMSI = argv[3]
    # SOG
    if(argv[4] == 'null'):
        startPoint[3] = 0 + (random()*(100-(0)))
    else:
        startPoint[3] = float(argv[4])
    # COG
    if(argv[5] == 'null'):
        startPoint[4] = 0 + (random()*(359-(0)))
    else:
        startPoint[4] = float(argv[5])
    # Heading
    if(argv[6] == 'null'):
        startPoint[5] = 0 + (random()*(359-(0)))
    else:
        startPoint[5] = float(argv[6])    
    # Path Len
    if (argv[7] == 'null' or (int(argv[7]) < 1)):
        pathLen = 30
    else:
        pathLen = int(argv[7])
    # Event Chance
    if(argv[8] == 'null'):
        eventChance = 0
    else:
        eventChance = int(argv[8])


    

    print('Starting path generation')
    pathDeltas, srcStart = readData()

    splitAt = int(len(pathDeltas)*0.6)
    trainX, testX = pathDeltas[0:splitAt], pathDeltas[splitAt:]
    trainY = trainX.shift(-1, fill_value=0)
    testY = testX.shift(-1, fill_value=0)

    trainX = trainX.values
    trainX = trainX.reshape(trainX.shape[0], 1, trainX.shape[1]) 

    testX = testX.values
    testX = testX.reshape(testX.shape[0], 1, testX.shape[1]) 

    print('Train and test data ready')

    newPath = deltaToPath(pathDeltas, srcStart)
    print(newPath)

    # Train or load a model
    if(usePretrained):
        trainedModel = load_model('./machinelearning/models/savedModel.h5')
    else:
        trainedModel = fitLSTM(trainX, trainY, testX, testY, epochs=100, neurons=32, batch_size = 1)
    
    clearJsons()

    startData = pathDeltas.values.reshape(pathDeltas.shape[0], 1, pathDeltas.shape[1])
    startData = np.array([startData[0]])

    predicted = startData
    # predicted = np.append(predicted, trainedModel.predict(startData), axis=0)
    
    newLon = 0.001 * cos(radians(90 - startPoint[5]))
    newLat = 0.001 * sin(radians(90 - startPoint[5]))
    artificialDelta = [[[0.1, newLat, newLon, 0.1, 0.1, 0.001]]]
    predicted = np.append(predicted, artificialDelta, axis=0)

    for i in range(pathLen-2):
        print("in loop")
        predicted = np.append(predicted, [trainedModel.predict(predicted)[-1]], axis=0)

        r = randint(0,100)
        if(r < eventChance):
            # read config
            with open('./frontend/config.json', 'r') as data_file:
                json_data = data_file.read()
            config = json.loads(json_data)
            eventspool = config['EventConfig']['EventsPool']
            # pick random event and store it
            eventindex = randint(0, len(eventspool)-1)
            event = eventspool[eventindex]
            # include associated node info
            event['PathNode']=i
            # add the full event details to the array
            events.append(event)

    predicted = predicted.reshape(predicted.shape[0], predicted.shape[2])
    predicted = deltaToPath(predicted, startPoint)

    outputPaths(predicted, MMSI, events)
